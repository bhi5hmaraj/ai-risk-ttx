locals {
  infisical_secret_env = {
    INFISICAL_TOKEN = {
      secret  = var.infisical_secret_name
      version = "latest"
    }
  }
}

module "stein" {
  source = "../modules/cloud-run-service"

  name     = var.stein_service_name
  location = var.region
  image    = var.stein_image

  min_instances = 1
  max_instances = 1

  env = {
    NODE_ENV = "production"
  }

  secret_env = local.infisical_secret_env
}

module "app" {
  source = "../modules/cloud-run-service"

  name     = var.app_service_name
  location = var.region
  image    = var.app_image

  min_instances = 0
  max_instances = 3

  env = {
    NODE_ENV                    = "production"
    NEXT_PUBLIC_COLYSEUS_HTTP_BASE = module.stein.url
    NEXT_PUBLIC_COLYSEUS_URL       = replace(module.stein.url, "https://", "wss://")
  }

  secret_env = local.infisical_secret_env
}

