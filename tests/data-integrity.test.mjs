import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const snapshot = JSON.parse(
  await readFile(new URL("../app/data/residents.json", import.meta.url), "utf8"),
);

test("province totals reconcile to the national snapshot", () => {
  assert.equal(snapshot.provinces.length, 17);
  for (const key of [
    "total",
    "china",
    "koreanChinese",
    "chinaCombined",
    "residentPopulation",
    "population",
  ]) {
    const sum = snapshot.provinces.reduce((total, province) => total + province[key], 0);
    assert.equal(sum, snapshot.national[key], key);
  }
});

test("combined Chinese count preserves the two source categories", () => {
  assert.equal(
    snapshot.national.chinaCombined,
    snapshot.national.china + snapshot.national.koreanChinese,
  );
  for (const province of snapshot.provinces) {
    assert.equal(province.chinaCombined, province.china + province.koreanChinese);
  }
});

test("every province reconciles to its district totals for displayed metrics", () => {
  for (const province of snapshot.provinces) {
    assert.ok(province.districts.length > 0, province.shortName);
    for (const key of [
      "total",
      "china",
      "koreanChinese",
      "chinaCombined",
      "residentPopulation",
      "population",
    ]) {
      const districtSum = province.districts.reduce(
        (total, district) => total + district[key],
        0,
      );
      assert.equal(districtSum, province[key], `${province.shortName}-${key}`);
    }
  }
});

test("district labels are unique inside each province and counts are non-negative", () => {
  for (const province of snapshot.provinces) {
    const names = province.districts.map((district) => district.name);
    assert.equal(new Set(names).size, names.length, province.shortName);
    for (const district of province.districts) {
      for (const key of [
        "total",
        "china",
        "koreanChinese",
        "chinaCombined",
        "residentPopulation",
        "population",
      ]) {
        assert.ok(Number.isFinite(district[key]) && district[key] >= 0, `${province.shortName}-${district.name}-${key}`);
      }
      assert.equal(
        district.population,
        district.residentPopulation + district.total,
        `${province.shortName}-${district.name}-population formula`,
      );
    }
    assert.equal(
      province.population,
      province.residentPopulation + province.total,
      `${province.shortName}-population formula`,
    );
  }
});

test("Jeju ranks first by Chinese registered residents per 100 local residents", () => {
  const ranking = [...snapshot.provinces].sort(
    (a, b) =>
      b.chinaCombined / b.population - a.chinaCombined / a.population,
  );
  const jeju = snapshot.provinces.find((province) => province.shortName === "제주");
  assert.ok(jeju);
  assert.equal(ranking[0].shortName, "제주");
  const per100 = (jeju.chinaCombined / jeju.population) * 100;
  assert.ok(per100 > 1.5 && per100 < 1.6, per100);
});
