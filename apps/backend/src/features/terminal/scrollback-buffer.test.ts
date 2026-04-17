import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { ScrollbackBuffer } from "./scrollback-buffer";

describe("ScrollbackBuffer", () => {
  it("should push and iterate items in order", () => {
    const buffer = new ScrollbackBuffer(10);
    const data1 = new Uint8Array([1, 2, 3]);
    const data2 = new Uint8Array([4, 5, 6]);

    buffer.push(data1);
    buffer.push(data2);

    const items = Array.from(buffer.iter());
    assert.equal(items.length, 2);
    assert.deepEqual(items[0], data1);
    assert.deepEqual(items[1], data2);
  });

  it("should overwrite oldest items when full (circular behavior)", () => {
    const buffer = new ScrollbackBuffer(3);

    buffer.push(new Uint8Array([1]));
    buffer.push(new Uint8Array([2]));
    buffer.push(new Uint8Array([3]));
    buffer.push(new Uint8Array([4])); // Overwrites [1]

    const items = Array.from(buffer.iter());
    assert.equal(items.length, 3);
    assert.deepEqual(items[0], new Uint8Array([2]));
    assert.deepEqual(items[1], new Uint8Array([3]));
    assert.deepEqual(items[2], new Uint8Array([4]));
  });

  it("should return correct size", () => {
    const buffer = new ScrollbackBuffer(5);
    assert.equal(buffer.size, 0);

    buffer.push(new Uint8Array([1]));
    assert.equal(buffer.size, 1);

    buffer.push(new Uint8Array([2]));
    assert.equal(buffer.size, 2);
  });

  it("should not exceed maxLines in size", () => {
    const buffer = new ScrollbackBuffer(2);
    buffer.push(new Uint8Array([1]));
    buffer.push(new Uint8Array([2]));
    buffer.push(new Uint8Array([3]));
    buffer.push(new Uint8Array([4]));

    assert.equal(buffer.size, 2);
  });

  it("should clear all items", () => {
    const buffer = new ScrollbackBuffer(10);
    buffer.push(new Uint8Array([1, 2, 3]));
    buffer.push(new Uint8Array([4, 5, 6]));

    buffer.clear();

    assert.equal(buffer.size, 0);
    assert.equal(Array.from(buffer.iter()).length, 0);
  });

  it("should handle wrap-around correctly", () => {
    const buffer = new ScrollbackBuffer(3);

    // Fill buffer
    buffer.push(new Uint8Array([1]));
    buffer.push(new Uint8Array([2]));
    buffer.push(new Uint8Array([3]));

    // Overwrite twice
    buffer.push(new Uint8Array([4])); // Overwrites [1]
    buffer.push(new Uint8Array([5])); // Overwrites [2]

    const items = Array.from(buffer.iter());
    assert.equal(items.length, 3);
    assert.deepEqual(items[0], new Uint8Array([3]));
    assert.deepEqual(items[1], new Uint8Array([4]));
    assert.deepEqual(items[2], new Uint8Array([5]));
  });

  it("should calculate memory usage", () => {
    const buffer = new ScrollbackBuffer(10);
    buffer.push(new Uint8Array(100));
    buffer.push(new Uint8Array(200));

    assert.equal(buffer.memoryUsage, 300);
  });

  it("should throw on invalid maxLines", () => {
    assert.throws(() => new ScrollbackBuffer(0));
    assert.throws(() => new ScrollbackBuffer(-1));
  });

  it("should handle empty iteration", () => {
    const buffer = new ScrollbackBuffer(10);
    const items = Array.from(buffer.iter());
    assert.equal(items.length, 0);
  });

  it("should toArray return correct order", () => {
    const buffer = new ScrollbackBuffer(3);
    buffer.push(new Uint8Array([1]));
    buffer.push(new Uint8Array([2]));
    buffer.push(new Uint8Array([3]));

    const arr = buffer.toArray();
    assert.equal(arr.length, 3);
    assert.deepEqual(arr[0], new Uint8Array([1]));
    assert.deepEqual(arr[1], new Uint8Array([2]));
    assert.deepEqual(arr[2], new Uint8Array([3]));
  });
});
