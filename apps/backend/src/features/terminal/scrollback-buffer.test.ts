import { describe, it, expect } from "bun:test";
import { ScrollbackBuffer } from "./scrollback-buffer";

describe("ScrollbackBuffer", () => {
  it("should push and iterate items in order", () => {
    const buffer = new ScrollbackBuffer(10);
    const data1 = new Uint8Array([1, 2, 3]);
    const data2 = new Uint8Array([4, 5, 6]);

    buffer.push(data1);
    buffer.push(data2);

    const items = Array.from(buffer.iter());
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual(data1);
    expect(items[1]).toEqual(data2);
  });

  it("should overwrite oldest items when full (circular behavior)", () => {
    const buffer = new ScrollbackBuffer(3);

    buffer.push(new Uint8Array([1]));
    buffer.push(new Uint8Array([2]));
    buffer.push(new Uint8Array([3]));
    buffer.push(new Uint8Array([4])); // Overwrites [1]

    const items = Array.from(buffer.iter());
    expect(items).toHaveLength(3);
    expect(items[0]).toEqual(new Uint8Array([2]));
    expect(items[1]).toEqual(new Uint8Array([3]));
    expect(items[2]).toEqual(new Uint8Array([4]));
  });

  it("should return correct size", () => {
    const buffer = new ScrollbackBuffer(5);
    expect(buffer.size).toBe(0);

    buffer.push(new Uint8Array([1]));
    expect(buffer.size).toBe(1);

    buffer.push(new Uint8Array([2]));
    expect(buffer.size).toBe(2);
  });

  it("should not exceed maxLines in size", () => {
    const buffer = new ScrollbackBuffer(2);
    buffer.push(new Uint8Array([1]));
    buffer.push(new Uint8Array([2]));
    buffer.push(new Uint8Array([3]));
    buffer.push(new Uint8Array([4]));

    expect(buffer.size).toBe(2);
  });

  it("should clear all items", () => {
    const buffer = new ScrollbackBuffer(10);
    buffer.push(new Uint8Array([1, 2, 3]));
    buffer.push(new Uint8Array([4, 5, 6]));

    buffer.clear();

    expect(buffer.size).toBe(0);
    expect(Array.from(buffer.iter())).toHaveLength(0);
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
    expect(items).toHaveLength(3);
    expect(items[0]).toEqual(new Uint8Array([3]));
    expect(items[1]).toEqual(new Uint8Array([4]));
    expect(items[2]).toEqual(new Uint8Array([5]));
  });

  it("should calculate memory usage", () => {
    const buffer = new ScrollbackBuffer(10);
    buffer.push(new Uint8Array(100));
    buffer.push(new Uint8Array(200));

    expect(buffer.memoryUsage).toBe(300);
  });

  it("should throw on invalid maxLines", () => {
    expect(() => new ScrollbackBuffer(0)).toThrow();
    expect(() => new ScrollbackBuffer(-1)).toThrow();
  });

  it("should handle empty iteration", () => {
    const buffer = new ScrollbackBuffer(10);
    const items = Array.from(buffer.iter());
    expect(items).toHaveLength(0);
  });

  it("should toArray return correct order", () => {
    const buffer = new ScrollbackBuffer(3);
    buffer.push(new Uint8Array([1]));
    buffer.push(new Uint8Array([2]));
    buffer.push(new Uint8Array([3]));

    const arr = buffer.toArray();
    expect(arr).toHaveLength(3);
    expect(arr[0]).toEqual(new Uint8Array([1]));
    expect(arr[1]).toEqual(new Uint8Array([2]));
    expect(arr[2]).toEqual(new Uint8Array([3]));
  });
});
