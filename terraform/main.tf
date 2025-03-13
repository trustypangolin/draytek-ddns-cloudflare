resource "cloudflare_workers_script" "draytek_dynamic_dns" {
  account_id  = var.account_id
  script_name = var.worker_id
  content     = file(format("%s/../src/worker.js", path.root))
}

resource "cloudflare_workers_script_subdomain" "draytek_dynamic_dns" {
  account_id       = var.account_id
  script_name      = cloudflare_workers_script.draytek_dynamic_dns.script_name
  enabled          = true
  previews_enabled = false
}

data "cloudflare_zones" "zones" {}

data "cloudflare_dns_records" "dns_records" {
  zone_id = local.zone_map[var.zone]
  name = {
    exact = format("%s.%s", var.zone_record, var.zone)
  }
  type = "A"
}

locals {
  # Each Domain in the account will have an ID associated with it, let make a map to make it easy to reference in terraform
  # It can be found in the Cloudflare UI at https://dash.cloudflare.com/<account_id>/<domain_name> under API
  zone_map        = { for zones in data.cloudflare_zones.zones.result[*] : zones.name => zones.id }

  # Each record in a domain will have a record_id, not shown in the Cloudflare UI, but we use it in the worker code
  zone_record_map = { for records in data.cloudflare_dns_records.dns_records.result[*] : records.name => records.id }
}

# We want this output to be the copy/paste value for the draytek Service API value, It should look similar to this
# /dynamic/dns/update?zone_id=1aa2aa3444a4444444444444a4444a4a&record_id=11aa11aa11aa11aaa1a1a1aaa1a1aaaa&record_domain=domain.com&ip=###IP###
output "draytek" {
  value =  format(
    "/dynamic/dns/update?zone_id=%s&record_id=%s&record_domain=%s&ip=###IP###"
    , local.zone_map[var.zone]                                          # Pull the zone_id from the given domain eg domain.com
    , local.zone_record_map[format("%s.%s", var.zone_record, var.zone)] # Pull the record_id from the given A record, eg *.domain.com
    , var.zone                                                          # Input the zone for the API
  )
}

# You can import manually created workers
# however they may be replaced, even if everything appears to match

# import {
#   to = cloudflare_workers_script.draytek_dynamic_dns
#   id = format("%s/%s", var.account_id, var.worker_id)
# }

