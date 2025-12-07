# plumber.R
# Entry point for R Categorical Data Preprocessing API

library(plumber)

# Load internal modules
source("R/config.R")
source("R/connections.R")
source("R/storage.R")
source("R/preprocessing.R")
source("R/jobs.R")
source("R/routes.R")

#* @apiTitle R Categorical Data Preprocessing API
#* @apiDescription Comprehensive categorical and numerical preprocessing pipeline with Redis and PostgreSQL storage

#* @plumber
function(pr) {
  pr %>%
    pr_get("/health",        health_handler) %>%
    pr_post("/process",      process_handler) %>%
    pr_post("/clean",        clean_handler) %>%
    pr_post("/clean-inline", clean_inline_handler) %>%
    pr_get("/result/redis",  result_redis_handler) %>%
    pr_get("/result/postgres", result_postgres_handler)
}
