import { isSubPath } from '..';
import * as Path from 'path';

describe('utils | isSubPath', () => {
  it('should return true if path is a subpath', () => {
    expect(isSubPath('/root', '/root/child')).toBeTruthy();
  });

  it('should return false if path is not a subpath', () => {
    expect(isSubPath('/root/foo', '/root/bar/baz')).toBeFalsy();
  });

  it('should return false if path has a similar substring', () => {
    expect(isSubPath('/root/foo', '/root/foo bar/baz')).toBeFalsy();
  });

  it("should return true if path has special path .. symbols and it's a subpath", () => {
    expect(isSubPath('/root/foo', '/root/../root/foo/bar')).toBeTruthy();
  });

  it("should return true if path has special path . symbol and it's a subpath", () => {
    expect(isSubPath('/root/foo', '/root/./foo/bar')).toBeTruthy();
  });
});

describe('utils | isSubPath [win32]', () => {
  let relativeSpy: jest.SpyInstance;
  let isAbsoluteSpy: jest.SpyInstance;

  beforeEach(() => {
    relativeSpy = jest
      .spyOn(Path, 'relative')
      .mockImplementationOnce(Path.win32.relative);
    isAbsoluteSpy = jest
      .spyOn(Path, 'isAbsolute')
      .mockImplementationOnce(Path.win32.isAbsolute);
  });

  afterEach(() => {
    relativeSpy.mockRestore();
    isAbsoluteSpy.mockRestore();
  });

  it('should return true if path is a subpath', () => {
    expect(isSubPath('C:\\Foo', 'C:\\Foo\\Bar')).toBeTruthy();
  });
  it('should return false if path is not a subpath', () => {
    expect(isSubPath('C:\\Foo\\Bar', 'D:\\Foo\\Bar')).toBeFalsy();
  });
});
