variable "name" {
  type = string
}

variable "location" {
  type = string
}

variable "image" {
  type = string
}

variable "service_account" {
  type    = string
  default = null
}

variable "container_port" {
  type    = number
  default = 0
}

variable "cpu" {
  type    = number
  default = 1
}

variable "memory" {
  type    = string
  default = "1Gi"
}

variable "min_instances" {
  type    = number
  default = 0
}

variable "max_instances" {
  type    = number
  default = 3
}

variable "env" {
  type    = map(string)
  default = {}
}

variable "secret_env" {
  type = map(object({
    secret  = string
    version = string
  }))
  default = {}
}

variable "allow_unauthenticated" {
  type    = bool
  default = true
}

variable "ingress" {
  type    = string
  default = "INGRESS_TRAFFIC_ALL"
}

