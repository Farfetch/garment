import { defineOptions } from '../src/defineRunner';

describe('defineRunner', () => {
  test('returns correct schema', () => {
    expect(
      defineOptions({ foo: ['string'], bar: ['number?'], configFile: ['path'] })
        .schema
    ).toMatchSnapshot();
  });
});
