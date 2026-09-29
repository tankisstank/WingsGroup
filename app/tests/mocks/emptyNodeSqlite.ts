export class DatabaseSync {
  close() {}
  exec() {}
  prepare() {
    return {
      all: () => [],
      get: () => null,
      run: () => ({ changes: 0, lastInsertRowid: 0 }),
    }
  }
}

export default { DatabaseSync }
