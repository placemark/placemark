### Development with Docker

Placemark was originally developed without using Docker, so the Docker
configuration is a little new. Note that this docker configuration
is optimized for _development_ - we don't yet have a configuration
for production.



#### Prepare

```bash
cp .env.example .env.local
```

### Add your Mapbox access token  in 
``` .env.local ```

`NEXT_PUBLIC_MAPBOX_TOKEN=YOUR_MAPBOX_ACCESS_TOKEN`

#### Build

```bash
docker-compose build
```

#### Run

```bash
docker-compose up
```
#### Run in detached(background) mode 

```bash
docker-compose up -d
```


- Open [localhost:3000](http://localhost:3000/) for the server.
- Open [localhost:5555](http://localhost:5555/) for the Prisma database browser.
