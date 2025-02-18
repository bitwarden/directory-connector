if ! [ -x "$(command -v mkcert)" ]; then
  echo 'Error: mkcert is not installed. Install mkcert first and then re-run this script.'
  echo 'e.g. brew install mkcert'
  exit 1
fi

mkcert -install
mkdir -p ./openldap/certs
cp "$(mkcert -CAROOT)/rootCA.pem" ./openldap/certs/rootCA.pem
mkcert -key-file ./openldap/certs/openldap-key.pem -cert-file ./openldap/certs/openldap.pem localhost openldap
