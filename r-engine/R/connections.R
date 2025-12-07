# R/connections.R
# Connection helpers for Redis and PostgreSQL

get_redis_conn <- function() {
  tryCatch({
    conn <- redux::hiredis(host = REDIS_HOST, port = REDIS_PORT)
    print("Redis connection established")
    conn
  }, error = function(e) {
    warning("Redis connection failed: ", e$message)
    NULL
  })
}

get_postgres_conn <- function() {
  tryCatch({
    conn <- dbConnect(
      Postgres(),
      host     = POSTGRES_HOST,
      port     = POSTGRES_PORT,
      user     = POSTGRES_USER,
      password = POSTGRES_PASSWORD,
      dbname   = POSTGRES_DB
    )
    print("PostgreSQL connection established")
    conn
  }, error = function(e) {
    warning("PostgreSQL connection failed: ", e$message)
    NULL
  })
}
