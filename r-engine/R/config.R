# R/config.R
# Global configuration, libraries, and helpers

# Libraries
library(jsonlite)
library(readr)
library(dplyr)
library(uuid)
library(RPostgres)
library(redux)
library(stringr)
library(tidyr)
library(DBI)

# Helper: null-coalescing
`%||%` <- function(a, b) if (is.null(a)) b else a

# Environment configuration
REDIS_HOST <- Sys.getenv("REDIS_HOST", "redis")
REDIS_PORT <- as.integer(Sys.getenv("REDIS_PORT", "6379"))

POSTGRES_HOST     <- Sys.getenv("POSTGRES_HOST", "postgres")
POSTGRES_PORT     <- as.integer(Sys.getenv("POSTGRES_PORT", "5432"))
POSTGRES_USER     <- Sys.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD <- Sys.getenv("POSTGRES_PASSWORD", "postgres")
POSTGRES_DB       <- Sys.getenv("POSTGRES_DB", "qualimind-testing")

print(paste("Connecting to Redis at", REDIS_HOST, ":", REDIS_PORT))
print(paste("Connecting to PostgreSQL at", POSTGRES_HOST, ":", POSTGRES_PORT, "DB:", POSTGRES_DB))
