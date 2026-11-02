// Application form (Mitmachen). The form encrypts each application in the
// browser with this PUBLIC key and drops it on the relay topic below
// (ntfy.sh). Only the GitHub Action .github/workflows/applications.yml can
// decrypt it (private key in the repo secret APPLY_PRIVATE_KEY) and posts
// it to Discord with the webhook from the secret DISCORD_WEBHOOK. Neither
// secret is ever part of this public site.
export const APPLY_RELAY = "https://ntfy.sh";
export const APPLY_TOPIC = "medienspeicher-bewerbung-151697172e317a61";
export const APPLY_PUBLIC_KEY = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnSBh6/edrG33sMJlzADHIm5uUi9hpRfmuqKGvb5lCeBXQY7+8r+bJ1+UTFRT64wIcl8Cq+Otb/sizPffv6hak9yF/JWf1FdVZ4vnrPi25ldNDoJJEww5Jh3Ot677OXshDDGN4a9pUDSHhKqB1TNseX63ReEQY3S9nxG8oFUSTQ0sUx256QBwP09w2j1vbPS8bc6DIai7uga39HyH8iZQugGTmLp8c/54PLlJwlUO3wGxuifqEeafhRMwcugfEgc1AGaJdchCcqoOh9Nwc+7OK8wlVctx5sM4j2bXQynjpO08E2N6wfb+sOe9GmynO1PfZmXl4MDXA4txSfweHZL39QIDAQAB";
