from fabric.api import env, local, run, settings, lcd, cd, get, put
from fabric.contrib.files import exists
from plugins.vault import Vault, write_file

import uuid
import datetime
import os


def once(func):
    func.run = False

    def wrapper():
        if not func.run:
            func.run = True
            return func()

    return wrapper

@once
def pullsshkey():
    key_file = os.path.expanduser("~/.ssh/id_rsa")
    if not os.path.exists(key_file):
        local('ssh-keygen -b 2048 -t rsa -q -N "" -f %s' % key_file)

    pub_file = os.path.expanduser("~/.ssh/id_rsa.pub")
    cert_file = os.path.expanduser("~/.ssh/id_rsa-cert.pub")
    vault = Vault()
    cert_content = vault.sign_ssh_key("%(project)s" % env, 
        mount="playbook-ssh",
        public_key_file=pub_file)
    write_file(cert_file, content=cert_content)
        
def production():
    env.host = "bilingual@bruno.api.co.th"
    env.hosts = ["%(host)s" % env,]
    env.project = "bilingual"
    env.home = "/home/%(project)s" % env
    env.optroot = "/opt/%(project)s" % env
    env.database_name = "%(project)s" % env
    env.git = "ssh://%(host)s/~/local.git" % env
    env.branch = "production"
    env.settings = "bilingual.settings"
    env.postgres_connection = ""
    pullsshkey()

    
def dbshell():
    with cd("%(optroot)s/app" % env):
        with settings(output_prefix=False):
            run('../.env/bin/python web/manage.py dbshell --settings %(settings)s' % env)


def deployweb():
    with cd("%(optroot)s/app" % env):
        run('../.env/bin/python web/manage.py check --settings %(settings)s' % env)
        run('../.env/bin/python web/manage.py migrate --settings %(settings)s' % env)

def deploybot():
    with cd('%(optroot)s/app/bot' % env):        
        run("npm install")
        if not exists("%(optroot)s/settings.ini" % env):
            print("settings.ini is required to start server")
            return

    if not exists("%(optroot)s/.postsetup-success" % env):
        print("Please run post setup script to finish installation")
        print("> cd %(optroot)s/app/configs/%(branch)s/ && sudo sh postsetup.sh" % env)
        return
    
    run("sudo /usr/bin/supervisorctl restart %(project)s" % env)

def deploycommands():
    with cd('%(optroot)s/app/bot' % env):        
        run('node deploy-commands.js')

def deployinfra():
    if not exists("~/workspace"):
        with cd(os.path.dirname("~/workspace")):
            run("git clone --branch %(branch)s ~/local.git workspace" % env)

    with cd("~/workspace"):
        run("git pull ~/local.git %(branch)s" % env)
        run("sh configs/%(branch)s/presetup.sh" % env)

    with cd("%(optroot)s/app" % env):
        run('git pull ~/local.git %(branch)s' % env)    

    with cd("%(optroot)s/" % env):
        run('.env/bin/pip install --upgrade pip' % env)
        run('.env/bin/pip install -r app/web/requirements.txt' % env)
        run('.env/bin/python app/plugins/compilesecret.py --output settings.ini app/configs/%(branch)s/settings.ini' % env)

def deploy():
    push()
    deployinfra()
    deployweb()
    deploybot()

def merge():
    local('git checkout %(branch)s' % env)
    local('git merge main')
    local('git checkout main')

def push():
    if not exists("~/local.git"):
        with cd(env.home):
            run("git init --bare local.git")
    local("git push %(git)s %(branch)s" % env, capture=False)

def pull():
    local('git pull %(git)s %(branch)s' % env, capture=False)

def pullsettings():
    with cd(env.optroot):
        get('settings.ini', 'settings.ini')

def pushsettings():
    with cd(env.optroot):
        put('settings.ini', 'settings.ini')

def log():
    with settings(output_prefix=False):
        run('tail -f %(optroot)s/log/*.log' % env)
        
def date_key():
    return datetime.datetime.now().strftime('%Y%m%d')

def backupdb():
    with settings(host_string='postgres@%(host)s' % env):
        env.date_key = date_key()
        run('/usr/lib/postgresql/14/bin/pg_dump %(postgres_connection)s %(database_name)s | gzip > %(database_name)s-%(date_key)s.gz' % env)
        get('%(database_name)s-%(date_key)s.gz' % env, 'Build/%(database_name)s-%(date_key)s.gz' % env)
        local('cp -f Build/%(database_name)s-%(date_key)s.gz Build/%(database_name)s.gz' % env)
        run('rm -f %(database_name)s-%(date_key)s.gz' % env)

def psql():
    with settings(host_string='postgres@%(host)s' % env, output_prefix=False):
        run('psql %(postgres_connection)s %(database_name)s' % env)

def slowquery():
    run('grep duration /var/log/postgresql/postgresql-14-main.log')

def ssh():
    local('ssh %s' % env.hosts[0])

