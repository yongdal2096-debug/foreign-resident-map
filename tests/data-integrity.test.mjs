import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
}

const summary = await readJson("../app/data/summary.json");
const provinceChunks = await Promise.all(
  [1, 2, 3, 4, 5].map((index) => readJson(`../app/data/provinces-${index}.json`)),
);
const snapshot = { ...summary, provinces: provinceChunks.flat() };

test("province totals reconcile to the national snapshot", () => {
  assert.equal(snapshot.provinces.length, 17);
  for (const key of ["total", "china", "koreanChinese", "chinaCombined"]) {
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

test("Jeju district totals reconcile", () => {
  const jeju = snapshot.provinces.find((province) => province.shortName === "제주");
  assert.ok(jeju);
  assert.deepEqual(
    jeju.districts.map((district) => district.name).sort(),
    ["서귀포시", "제주시"],
  );
  assert.equal(
    jeju.districts.reduce((total, district) => total + district.chinaCombined, 0),
    jeju.chinaCombined,
  );
});
