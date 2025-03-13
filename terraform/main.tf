resource "cloudflare_workers_script" "draytek_dynamic_dns" {
  account_id  = var.account_id
  script_name = "ddns"
  content     = file("../src/worker.js")
}

resource "cloudflare_workers_script_subdomain" "example_workers_script_subdomain" {
  account_id       = var.account_id
  script_name      = cloudflare_workers_script.draytek_dynamic_dns.script_name
  enabled          = true
  previews_enabled = false
}

import {
  to = cloudflare_workers_script.draytek_dynamic_dns
  id = format("%s/ddns", var.account_id)
}
