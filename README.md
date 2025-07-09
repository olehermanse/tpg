# TPG

https://tpg.oleherman.com

## Development server

Start the development server:

```
node server.js
```

For development purposes it defaults to port 3000:

http://127.0.0.1:3000

## Containers

### podman

```
podman build --tag tpg . && podman run -it -p 3000:3000 --name tpg --rm tpg
```

http://127.0.0.1:3000

### docker

```
docker build --tag tpg . && docker run -it -p 3000:3000 --name tpg --rm tpg
```

http://127.0.0.1:3000
