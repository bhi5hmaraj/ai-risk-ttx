terraform {
  backend "gcs" {
    # One-time: create this bucket, then update the value here.
    bucket = "simulacra-tf-state-personal-457416"
    prefix = "cloudrun"
  }
}

