.PHONY: podman docker

podman:
	podman build --tag tpg . && podman run -it -p 3000:3000 --name tpg --rm tpg


docker:
	docker build --tag tpg . && docker run -it -p 3000:3000 --name tpg --rm tpg
