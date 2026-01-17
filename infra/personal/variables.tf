variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "app_service_name" {
  type    = string
  default = "simulacra-app"
}

variable "stein_service_name" {
  type    = string
  default = "simulacra-stein"
}

variable "app_image" {
  type = string
}

variable "stein_image" {
  type = string
}

variable "infisical_secret_name" {
  type    = string
  default = "INFISICAL_TOKEN"
}

