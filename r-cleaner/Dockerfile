FROM rocker/r2u:24.04

RUN apt-get update && apt-get install -y --no-install-recommends \
  r-cran-plumber \
  r-cran-jsonlite \
  r-cran-readr \
  r-cran-dplyr \
  r-cran-uuid && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY plumber.R /app/plumber.R

EXPOSE 8000
CMD ["R", "-e", "pr <- plumber::plumb('plumber.R'); plumber::pr_run(pr, host='0.0.0.0', port=8000)"]


