---
date: '2025-11-15T21:42:54Z'
draft: false
title: 'Containerized development on Fedora Silverblue'
tags:
- development
- containers
---

After some time developing containerized applications, I made a habit of trying
to run everything in containers. The ability to sandbox applications allows me
to keep control over my system and makes me confident to discover new software.
In this post I will share how I use containerization to keep my development host
tidy and create portable development environments.

## Development Containers

Quoting the website, [Development Containers] "allows you to use a container as
a full-featured development environment", bringing the benefits of
containerization to software development. Basically you can start using a
development container by adding to your project a `.devcontainer.json` file as
simple as:

```json
{ "image": "mcr.microsoft.com/devcontainers/go" }
```

This will allow us to open our project within a container with a Golang
development environment (there is other images for most common languages),
embedding every tools that may be needed (compiler, debugger, language server,
linters, ...). You can also setup the container even further with
[DevContainer Features] to embed other tools required by your project. For
instance, I often put Docker *inside* of it:

```json
{
  "image": "mcr.microsoft.com/devcontainers/go",
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  }
}
```

With this simple file, we are creating a reproducible, shareable, disposable,
portable, isolated & secure development environment, that is versioned and
bundled along our project.

Lots of people use tools such as the [VSCode Dev Containers extension] for an
even simpler way to create, manage and run development containers. Personally, I
settled on [DevPod] as it allows me to use [Zed] instead.

## Fedora Silverblue

[Silverblue] is an *immutable / atomic* version of Fedora Workstation. It uses a
read-only root filesystem and is meant to be more stable than regular Linux
distributions. The update process is especially affected as they mostly require
to reboot the system to apply updates. This comes with a rollback feature in case
anything goes wrong.

While the installation of new packages is still possible (which
is layer based, pretty much like a Docker image), the philosophy behind
Silverblue is to keep the base system as vanilla as possible. Instead, you use
containerization technologies to run new software.

### Podman

Like Docker, [Podman] is a container runtime for developing, managing and
running containers. The main difference is that it is daemonless and rootless by
design. To put it simply, a container running under Podman is like any other
process that would be executed by a regular user.

The Podman client uses the same interface as Docker, meaning that if you know
Docker you already know Podman. Also, if your tools uses Docker under the hood
then there is a good chance that it can use Podman as well.

### Toolbx

[Toolbx] is built on top of Podman and allows users to run a Linux distribution
(Fedora, Arch, Ubuntu) in a container, which can be used to install system
programs that you would usually install directly on your host. Toolbx
environments are different from plain containers as they have seamless access to
the user's home directory, devices, Wayland & X11 sockets, networking, ... thus
behaving like any standard Linux command line environment.

For instance, let's create a new Ubuntu based toolbx:

```console
$ toolbox create -d ubuntu -r 25.04
Image required to create Toolbx container.
Download quay.io/toolbx/ubuntu-toolbox:25.04 ( ... MB)? [y/N]: y
Created container: ubuntu-toolbox-25.04
Enter with: toolbox enter ubuntu-toolbox-25.04
```

I can now enter it and work as if I were on a Ubuntu system:

```console
$ toolbox enter ubuntu-toolbox-25.04
$ cat /etc/lsb-release 
DISTRIB_ID=Ubuntu
DISTRIB_RELEASE=25.04
DISTRIB_CODENAME=plucky
DISTRIB_DESCRIPTION="Ubuntu 25.04"
```

### Flatpak

[Flatpak] is pretty well known now. It is a way to distribute and install Linux
applications and their dependencies in a way that we are more used to see with
appstores on smartphones. It provides the same advantages of sanboxing and
isolation but for desktop applications.

## Setting everything up

Thanks to this workflow, there only a few steps to get a new system up and ready
for development. On a freshly installed Silverblue system, you would simply need
to flatpak install VSCode and its DevContainers extension, pull and open your
project in the development container and you're good!

However, here is a few things that I ran into that may help:

- SELinux might get in the way when running containers. I usually edit
`/etc/selinux/config` to use permissive mode instead of enforcing. Alternatively
running `setenforce 0` yields the same result temporarily.
- The Docker-in-Docker daemon from DevContainer features might fail to start.
This may be because Fedora uses `nftables` while Docker needs `ip_tables`. To
fix this, you can simply run `modprobe ip_tables` and restart the container.
- Silverblue comes with Fedora preinstalled, but this version
[is known to not be able to play some video contents](https://discussion.fedoraproject.org/t/cant-play-videos-in-firefox/79645).
A simple workaround is to install the Flathub version of Firefox.

[Development Containers]: https://containers.dev/
[DevContainer Features]: https://containers.dev/features
[VSCode Dev Containers extension]: https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers
[DevPod]: https://devpod.sh/
[Zed]: https://zed.dev
[Silverblue]: https://fedoraproject.org/atomic-desktops/silverblue/
[Podman]: https://podman.io/
[Toolbx]: https://containertoolbx.org/
[Flatpak]: https://flatpak.org/
