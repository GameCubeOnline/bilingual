import os
import getpass
import json
import requests

VAULT_USERNAME = os.environ.get("VAULT_USERNAME", None)
VAULT_ADDR = os.environ.get("VAULT_ADDR", "https://vault.api.co.th")
VAULT_TOKEN_PATH = os.environ.get("VAULT_TOKEN_PATH", os.path.expanduser("~/.vaulttoken"))

def read_file(file_name):
    with open(file_name, "r") as f:
        content = ''.join(f.readlines())
    return content

def write_file(file_name, content=None):
    with open(file_name, "w") as f:
        f.write(content)

class Vault:
    def __init__(self, url=None, token_path=None, username=None):
        self.url = url or VAULT_ADDR
        self.token_path = token_path or VAULT_TOKEN_PATH
        self.username = username or VAULT_USERNAME
        self.cache_secrets = {}
        self.checked_token = None

    def clear(self):
        self.cache_secrets = {}
    
    def post(self, path, json=None, data=None, headers=None, files=None):
        return requests.post("%s%s" % (self.url, path), 
            data=data,
            json=json, 
            headers=headers,
            files=files)

    def get(self, path, json=None, data=None, headers=None):
        return requests.get("%s%s" % (self.url, path), 
            data=data,
            json=json, 
            headers=headers)

    def read_saved_token(self):
        if not os.path.exists(self.token_path):
            return
        return read_file(self.token_path)

    def save_token(self, token):
        if not self.token_path:
            return False
        write_file(self.token_path, content=token)
        return True

    def request_token(self):
        while True:
            username = self.username
            while True:
                username = input("vault username [%s]: " % username) or username
                if username:
                    break 
            
            password = None
            while not password:
                password = getpass.getpass("vault password (hidden): ")
    
            response = self.post("/v1/auth/userpass/login/%s" % username, json={
                "password": password,
            })

            data = response.json()
            auth = data.get("auth")
            if not auth:
                print("Wrong username or password, please try again")
                username = None 
                continue

            self.username = username

            client_token = auth.get("client_token")
            self.save_token(client_token)
            return client_token

    def get_token(self):
        token = self.read_saved_token()
        if token:
            if self.checked_token == token:
                return token
            self.checked_token = token
            if self.read_secret_field("handshake/ping") == "pong":
                return token
        return self.request_token()
    
    def get_token_headers(self):
        token = self.get_token()
        return {
            "X-Vault-Token": token,
        }
    
    def sign_ssh_key(self, role, public_key_file=None, mount=None):
        if not mount:
            mount = "ssh"
        response = self.post("/v1/%s/sign/%s" % (mount, role), 
            headers=self.get_token_headers(),
            json={
                "public_key": read_file(public_key_file),
            })

        r = response.json()
        data = r.get("data")
        if not data:
            print(r)
        return data.get("signed_key")

    def write_secret(self, path, data=None, mount=None, options=None):
        if not mount:
            mount = "secret"
        url = "/v1/%s/data/%s" % (mount, path)
        self.post(url, 
            json={
                "data": data,
            },
            headers=self.get_token_headers())
        self.cache_secrets[url] = data

    def update_secret(self, path, data=None, mount=None, options=None):
        old_data = self.read_secret(path, mount=mount) or {}
        if old_data:
            has_changed = False
            for k, v in data.items():
                if old_data.get(k) == v:
                    continue
                old_data[k] = v
                has_changed = True
            if not has_changed:
                return
            data = old_data
        
        self.write_secret(path, data=data, mount=mount, options=options)

    def read_secret(self, path, version=None, mount=None):
        version_args = ""
        if version:
            version_args = "?version=%s" % version
        if not mount:
            mount = "secret"

        url = "/v1/%s/data/%s%s" % (mount, path, version_args)
        data = self.cache_secrets.get(url)
        if data is not None:
            return data

        response = self.get(url, 
            headers=self.get_token_headers())
        r = response.json()
        data = r.get("data")
        if not data:
            return None
        result = data.get("data")
        self.cache_secrets[url] = result
        return result

    def read_secret_field(self, path, version=None, mount=None):
        parent, field = path.rsplit("/", 1)
        parent_data = self.read_secret(parent, mount=mount, version=version)
        if parent_data:
            return parent_data.get(field)
    
    def write_secret_field(self, path, value=None, mount=None, options=None):
        parent, field = path.rsplit("/", 1)
        parent_data = self.read_secret(parent, mount=mount) or {}
        if parent_data.get(field) == value:
            return
        parent_data[field] = value
        if value is None:
            del parent_data[field]
        self.write_secret(parent, data=parent_data, mount=mount, options=options)


def test():
    vault = Vault()
    print(vault.read_secret("aws_credentials"))
    vault.update_secret("playbook/hello", data={"value": "world"})
    vault.update_secret("playbook/hello", data={"value2": "yahoo"})

    print(vault.read_secret_field("aws_credentials/aws_access_key_id"))
    print(vault.write_secret_field("playbook/helloworld/value", value="amazon"))


def main():
    from optparse import OptionParser
    parser = OptionParser()
    parser.add_option("--token", dest="token")
    parser.add_option("--username", dest="username")
    parser.add_option("--read", dest="read")
    parser.add_option("--login", action="store_true", dest="login")
    options, args = parser.parse_args()

    vault = Vault(token_path=options.token, username=options.username)
    if options.login:
        vault.get_token()
        return

    if options.read:
        print(vault.read_secret_field(options.read))
        return



if __name__ == "__main__":
    main()





