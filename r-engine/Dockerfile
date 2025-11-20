FROM rocker/r2u:24.04

# Install system dependencies for PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
  libpq-dev \
  && rm -rf /var/lib/apt/lists/*

# Install R packages
RUN apt-get update && apt-get install -y --no-install-recommends \
  r-cran-plumber \
  r-cran-jsonlite \
  r-cran-readr \
  r-cran-readxl \
  r-cran-dplyr \
  r-cran-uuid \
  r-cran-rpostgres \
  r-cran-redux \
  r-cran-stringr \
  r-cran-forcats \
  r-cran-tidyr && \
  rm -rf /var/lib/apt/lists/*

# Install additional packages from CRAN if not available as binaries
RUN R -e "if (!require('recipes', quietly = TRUE)) install.packages('recipes', repos='https://cloud.r-project.org')"
RUN R -e "if (!require('janitor', quietly = TRUE)) install.packages('janitor', repos='https://cloud.r-project.org')"

WORKDIR /app
COPY plumber.R /app/plumber.R

EXPOSE 8000
CMD ["R", "-e", "pr <- plumber::plumb('plumber.R'); plumber::pr_run(pr, host='0.0.0.0', port=8000)"]


