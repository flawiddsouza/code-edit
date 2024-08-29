### Development

```
cargo run
```

### Linting

```
cargo fix --bin "code-edit" --allow-staged
```

### Build

```
cargo build --release
```

Built binary can be found at ./target/release/code-edit

### To bump version and do a release

```
cargo release minor --no-verify --no-publish --no-push --no-confirm --execute
```

#### To get the cargo release command

```
cargo install cargo-release
```
