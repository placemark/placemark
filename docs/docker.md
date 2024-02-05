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


#### Checking the logs

```bash
docker-compose logs -f
```

#### Checking logs for a web service

```bash
docker-compose logs -f web 
```
or
```bash
docker logs placemark-web
```

#### Checking logs for a db service

```bash
docker-compose logs -f db 
```
or
```bash
docker logs placemark-db
```

#### Checking logs for a prisma studio service

```bash
docker-compose logs -f prisma 
```
or
```bash
docker logs placemark-studio
```

#### Stopping all the services

```bash 
docker-compose down
```

#### Stopping a specific service

```bash 
docker-compose stop prisma
```

#### checking the database

```bash 
docker-compose exec db psql -U postgres -d placemark
``` 

#### Running prisma studio

```bash 
docker-compose exec prisma npx prisma studio
```

#### Running prisma migrate

```bash
docker-compose exec prisma npx prisma migrate dev --name init
```

#### Running prisma generate

```bash
docker-compose exec prisma npx prisma generate
```

#### Running prisma introspect

```bash
docker-compose exec prisma npx prisma db pull
```


#### Terminal access to the web service

```bash
docker-compose exec web bash
```

#### Terminal access to the db service

```bash 
docker-compose exec db bash
```

#### Rebuilding and recreate the web service

```bash
docker-compose up -d --build --force-recreate web
```
#### Resarting the web service

```bash
docker-compose restart web
```

Note: We are not exposing the database to the host machine, so you can't connect to the database using a database client like pgAdmin or DBeaver. If you want to connect to the database, you can use the terminal access to the db service. If you want to expose the database to the host machine, you can add the following line to the db service in the docker-compose.yml file.

```yaml
ports:
  - "5432:5432"
```
