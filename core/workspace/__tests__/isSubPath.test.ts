import { isSubPath } from '../src/isSubpath';

describe('isSubPath', () => {
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
