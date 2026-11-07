function load(path) {
  const raw = read(path);
  return parse(raw);
}
