import { expect } from "@playwright/test";

type ExpectMessage = [message?: Parameters<typeof expect>[1]];

type LengthValue = { readonly length: number } | null | undefined;

// These helpers retain the original hard matcher and its diagnostic value.
export const expectNotNull: <T>(
  value: T,
  ...message: ExpectMessage
) => asserts value is Exclude<T, null> = function expectNotNull<T>(
  value: T,
  ...message: ExpectMessage
): asserts value is Exclude<T, null> {
  expect(value, ...message).not.toBeNull();
};

export const expectDefined: <T>(
  value: T,
  ...message: ExpectMessage
) => asserts value is Exclude<T, undefined> = function expectDefined<T>(
  value: T,
  ...message: ExpectMessage
): asserts value is Exclude<T, undefined> {
  expect(value, ...message).toBeDefined();
};

export const expectTruthy: <T>(
  value: T,
  ...message: ExpectMessage
) => asserts value is NonNullable<T> = function expectTruthy<T>(
  value: T,
  ...message: ExpectMessage
): asserts value is NonNullable<T> {
  expect(value, ...message).toBeTruthy();
};

export const expectLength: <T extends LengthValue>(
  value: T,
  length: number,
  ...message: ExpectMessage
) => asserts value is NonNullable<T> = function expectLength<
  T extends LengthValue,
>(
  value: T,
  length: number,
  ...message: ExpectMessage
): asserts value is NonNullable<T> {
  expect<LengthValue>(value, ...message).toHaveLength(length);
};
