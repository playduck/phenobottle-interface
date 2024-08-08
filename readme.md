
<p align="center">
    <img style="height: 8em" src="./www/private/assets/dinolabsBlue.svg"/>
    <h1 style="margin: 1em">WARR D.I.N.O.labs phenobottle interface</h1>
    <a href="https://warr.robin-prillwitz.de">>>> live version <<<</a>
</p>

The server and web interface for the WARR spacelabs phenobottle.
This exposes a password-protected user interface, a REST-ful HTTP API and an SQL database connection.
The MySQL database must be hosted externally.

## Installation

This requires node 21.07 or above.
Other versions have not been tested.

```bash
# install dependencies
npm instal
# if the `node` command cannot be resolved, try yarn
yarn install

# run the server
npm start
# or run with automatic relaod using
nodemon app.js
```


### Hosting

The live version is hosted by [netcup](https://www.netcup.de) using their `Webhosting 4000` package.
Required settings for this provider:

- Disable nginx proxy mode
- Doc-Stem: `./www`
- App-Stem: `./`

### Secrets

The repository does not include the user credentials and database access information.
These must be provided separately in distinct files.

#### Users

User passwords are stored in `users.json`:
```json
[
    {
        "username": "AzureDiamond",
        "plainPassword": "hunter2",
        "level": 2
    }
]
```
Privileges are described by the `level` field:
0 is the least privileged user.
Passwords are loaded at runtime and hashed and salted using bcrypt.
Username comparisons use basic-auth's `safeCompare` function.

#### Database

Access to the mySQL database is described in `dbaccess.json`. It's contents are as follows:
````json
{
    "host": "db.example.com",
    "user": "db_admin_user",
    "password": "db_admin_password",
    "database": "mysql_db_name"
}
````

## User Interface

The user interface is protected with `jwt` sent as http-only cookies in a secure context.
Real-time communication is established by `socket.io` connections.
All communication must be handled over a secure and encrypted channel (e.g. TLS over HTTPS).
The `jwt` secret key is a UUIDv4, which is re-generated during server start.

The user should only ever need to access the website's `/` route.
They will be redirected to the appropriate login or interface.

## API

There are two types of APIs present: The Interface API and the device API:
The user interface requires the appropriate `jwt` cookie.
Other endpoints for the phenobottle devices are handled by basic-auth.

| endpoint  | auth| method | description |
| --------- | ---- | ------ | ----------- |
| `/api/v1/login ` | jwt | POST | login, credentials as a json object in the body |
| `/api/v1/logout` | jwt | POST | logout, resets and invalidates the `jwt` |
| `/api/v1/export` | jwt | GET | exports the relevant database tables as an excel file |
| `/api/v1/image/:1` | jwt | GET | gets the latets image of the device at id `:1` |
| `/api/v1/measurement` | basic | POST | measurements as json array |
| `/api/v1/image` | basic | POST | camera image as a multipart form |

## Database

The database is created on every server restart with the commands in the `/sql` folder.
A new and empty database can thus easily be populated.
However, keep in mind changes to the schema are not reflected by creation commands.
Any changes will require manual `ALTER` commands or re-generation by dropping tables.
The database is a MySQL database version `8.0.33 - MySQL Community Server - GPL`.

## Legal

This project is licensed under the GNU GPLv3.
Find a copy of the license at [COPYING](./COPYING).

---

<p align="center">
    <a href="https://robin-prillwitz.de">Robin Prillwitz MMXXIV</a>
</p>
