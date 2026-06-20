# WingsGroup VPS Access And Operations

Last verified: 2026-06-14 (Asia/Bangkok)

This document records access endpoints and operational paths. It must not
contain passwords, private key contents, Tailscale auth keys, API tokens, or
application secrets.

## VPS

| Field | Value |
| --- | --- |
| Public IP | `168.110.212.116` |
| Hostname | `instance-20260604-2317` |
| OS | Ubuntu 24.04.4 LTS |
| Architecture | ARM64 (`aarch64`) |
| Resources | 2 vCPU, 11 GiB RAM, 45 GB disk |
| SSH port | `22` |
| SSH user | `ubuntu` |

The VPS is hosted on Oracle Cloud infrastructure. Public access also depends
on the Oracle Cloud Security List or Network Security Group, not only the
firewall inside the VPS.

## SSH

Private key location on the authorized workstation:

```text
C:\Users\VIETD\Downloads\ssh-key-2026-06-04.key
```

Connect from PowerShell:

```powershell
ssh -i "C:\Users\VIETD\Downloads\ssh-key-2026-06-04.key" ubuntu@168.110.212.116
```

The private key file itself must not be copied into this repository.

## aaPanel

| Field | Value |
| --- | --- |
| Installation directory | `/www/server/panel` |
| Panel service | `btpanel.service` |
| Panel port | `14199` |
| Security path | `/929fd0c3` |
| Nginx virtual hosts | `/www/server/panel/vhost/nginx/` |
| Shared origin cert for WingsGroup domains | `/www/server/panel/vhost/cert/wings-travel-shared/` |
| Cloudflare Origin Certificate files | `fullchain.pem`, `privkey.pem` |

Preferred access through Tailscale:

```text
https://100.105.131.116:14199/929fd0c3
```

MagicDNS alternative:

```text
https://qlv-sql-proxy-vps-2.taild819fc.ts.net:14199/929fd0c3
```

The aaPanel certificate may be self-signed. Verify the destination before
accepting a browser certificate warning.

Operational note: aaPanel is intended to be accessed through Tailscale during
normal operations. Do not expose the panel publicly unless that decision is
explicitly made and documented.

Useful checks:

```bash
sudo systemctl status btpanel
sudo ss -lntp | grep :14199
sudo nginx -t
```

## Tailscale

| Field | Value |
| --- | --- |
| Service | `tailscaled.service` |
| Current node name | `qlv-sql-proxy-vps-2` |
| Tailscale IPv4 | `100.105.131.116` |
| MagicDNS name | `qlv-sql-proxy-vps-2.taild819fc.ts.net` |
| Tailnet DNS suffix | `taild819fc.ts.net` |

Useful checks:

```bash
sudo systemctl status tailscaled
sudo tailscale status
sudo tailscale ip -4
sudo tailscale ping mdl
sudo tailscale ping mdl-gold
```

Known SQL nodes:

| Node | Tailscale IPv4 | SQL port |
| --- | --- | --- |
| `mdl` | `100.92.172.107` | `1433` |
| `mdl-gold` | `100.81.78.26` | `1433` |

## Tailscale SQL Proxy

The previous QLV deployment remains active and is independent from
WingsGroup.

| Field | Value |
| --- | --- |
| Deployment directory | `/home/ubuntu/tailscale-service-proxy` |
| Docker container | `tailscale-service-proxy-tcp-proxy-1` |
| Service name | `svc:qlv-sql` |
| Listen port | `1433` |
| Current backend | `100.81.78.26:1433` (`mdl-gold`) |

Check status:

```bash
cd /home/ubuntu/tailscale-service-proxy
sudo ./status.sh
sudo docker compose ps
```

Switch backend to `mdl`:

```bash
cd /home/ubuntu/tailscale-service-proxy
sudo ./switch-backend.sh 100.92.172.107 1433
```

Switch backend to `mdl-gold`:

```bash
cd /home/ubuntu/tailscale-service-proxy
sudo ./switch-backend.sh 100.81.78.26 1433
```

The historical tests showed approximately 198-212 ms latency through the VPS
SQL proxy, compared with approximately 2-10 ms when connecting directly to
`mdl`. Do not use this proxy for latency-sensitive workloads without retesting.

## WingsGroup Deployment

| Field | Value |
| --- | --- |
| Public brand/app identity | `WingsGroup` |
| Base directory | `/home/ubuntu/wings-travel` |
| Current release link | `/home/ubuntu/wings-travel/current` |
| Runtime environment | `/home/ubuntu/wings-travel/shared/.env` |
| Admin credential file | `/home/ubuntu/wings-travel/shared/admin.env` |
| Media directory | `/home/ubuntu/wings-travel/shared/data/media` |
| Backup directory | `/home/ubuntu/wings-travel/shared/backups` |
| Docker project | `wingstravel` |
| Application binding | `127.0.0.1:3000` |
| aaPanel-managed domains | `wingsgroup.vn`, `wingsgo.vn`, `wingsside.vn`, `wingsplus.vn` |
| TLS mode target | `Cloudflare Full` now, `Full (strict)` after origin cert rotation if needed |

Current containers:

```text
wingstravel-app-1
wingstravel-postgres-1
wingstravel-redis-1
wingstravel-tunnel
```

Check the deployment:

```bash
cd /home/ubuntu/wings-travel/current/app
sudo docker compose \
  --env-file /home/ubuntu/wings-travel/shared/.env \
  -p wingstravel \
  -f docker-compose.production.yml ps
```

Operational note: the public product identity is now `WingsGroup`, but the
current VPS directory, Docker project name, and Docker volumes intentionally
keep the legacy `wings-travel` / `wingstravel` names to preserve production
PostgreSQL and Redis data. Rename those infrastructure identifiers only through
a dedicated migration plan with volume backup and restore checks.

Do not print or commit the contents of `.env`, `admin.env`, SSH private keys, or
Tailscale credentials.
