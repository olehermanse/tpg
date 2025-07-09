# TPG

https://tpg.oleherman.com

## Run locally (containers)

Using podman:

```bash
podman build --tag tpg . && podman run -it -p 3000:3000 --name tpg --rm tpg
```

Or:

```bash
make podman
```

Using docker:

```bash
docker build --tag tpg . && docker run -it -p 3000:3000 --name tpg --rm tpg
```

Or:

```bash
make docker
```

Open in browser:

http://127.0.0.1:3000
