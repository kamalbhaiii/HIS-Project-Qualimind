# plumber.R
# Entry point for the R Categorical Data Preprocessing API

library(plumber)

# Load internal modules
source("R/config.R")
source("R/connections.R")
source("R/storage.R")
source("R/preprocessing.R")
source("R/jobs.R")
source("R/routes.R")
source("R/preprocessing_config.R")
source("R/correlation.R")


#* @apiTitle R Categorical Data Preprocessing API
#* @apiDescription Categorical & numerical preprocessing pipeline with Redis and PostgreSQL storage

#* @plumber
function(pr) {
  pr %>%
    pr_get("/health", health_handler) %>%
    pr_post("/clean", clean_handler)
}
