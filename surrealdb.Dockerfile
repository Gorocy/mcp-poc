FROM surrealdb/surrealdb:latest

COPY init.surql init.surql

ENTRYPOINT ["/surreal", "start", "--user", "root", "--pass", "root", "memory", "--import-file", "init.surql"] 