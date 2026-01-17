resource "google_cloud_run_v2_service" "this" {
  name     = var.name
  location = var.location

  template {
    service_account = var.service_account

    containers {
      image = var.image

      dynamic "env" {
        for_each = var.env
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.secret_env
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value.secret
              version = env.value.version
            }
          }
        }
      }

      dynamic "ports" {
        for_each = var.container_port > 0 ? [1] : []
        content {
          container_port = var.container_port
        }
      }

      resources {
        limits = {
          cpu    = tostring(var.cpu)
          memory = var.memory
        }
      }
    }

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }
  }

  ingress = var.ingress
}

resource "google_cloud_run_v2_service_iam_binding" "invoker" {
  count    = var.allow_unauthenticated ? 1 : 0
  name     = google_cloud_run_v2_service.this.name
  location = google_cloud_run_v2_service.this.location
  role     = "roles/run.invoker"
  members  = ["allUsers"]
}

output "url" {
  value = google_cloud_run_v2_service.this.uri
}

