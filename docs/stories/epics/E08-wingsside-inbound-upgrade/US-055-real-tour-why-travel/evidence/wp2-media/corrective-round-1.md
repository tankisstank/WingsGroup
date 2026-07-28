# WP2 corrective round 1

## Scope

This corrective round hardens the canonical D4-C source-inventory tooling. It
does not change the blocked watermark-removal outcome and does not add or
approve any processed image.

## Corrected boundary

The inventory CLI now:

- resolves the approved media root to its real path once;
- rejects absolute paths, parent traversal, empty components and paths outside
  the approved root;
- inspects every path component with `lstat` and rejects a symlink or Windows
  junction;
- requires the final real path to remain beneath the real approved root;
- reads a regular file through one open handle;
- compares device, inode, size, modification time and change time before and
  after the read; and
- resolves and checks the lexical path again before accepting the bytes and
  SHA-256.

The same verified-file primitive binds the editorial manifest and SQLite file.
The CLI hashes the SQLite bytes before querying, closes the database, then
re-reads and compares real path, byte length and hash before producing the
inventory.

## Runtime schema validation

The editorial source manifest and canonical inventory now use strict runtime
parsers. They reject:

- unknown or missing fields;
- unsupported schema versions or locale;
- malformed SHA-256 values;
- wrong primitive types;
- invalid coverage counts; and
- malformed asset, media-ID and reference records.

## Regression evidence

The focused regression creates a Windows junction (or POSIX directory symlink)
inside an approved root that targets an outside directory. The verified reader
rejects it before reading the target. Separate cases reject absolute and parent
traversal paths and prove an ordinary regular file still passes.

Against the real local snapshot, hardened `generate` followed by `verify`
reproduced:

- 22 tours;
- 714 source references;
- 714 media IDs;
- 586 unique content hashes;
- source snapshot
  `707a1acc8655663937c043143c24b062ee478d28d888ee029a2858da331fa446`;
  and
- inventory file SHA-256
  `7b1186411ae25f8a384c7157e6a989df4aeedca12b4e910853063524482d7e92`.

## Residual limitation

The CLI now detects database-path/byte changes during one collection, but it
does not create a WAL-safe SQLite online backup itself. Release use must bind
the command to an immutable application-created SQLite snapshot or, for the
production architecture, a separately governed PostgreSQL snapshot/export.
This residual does not change the current D4-C **blocked** status.
