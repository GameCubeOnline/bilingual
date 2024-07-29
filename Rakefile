

namespace :bot do
    task :setup do
        sh "python plugins/compilesecret.py --output settings.ini settings.ini"
    end

    task :run => :setup do
        Dir.chdir("bot") do
            sh "npm install"
            sh "npm run start"
        end
    end

    task :migrate => :setup do
        Dir.chdir("bot") do
            sh "npm install"
            sh "node migrate.js"
        end
    end
    
end


def django_manage(command)
    sh "web/.env/bin/python web/manage.py #{command} --settings bilingual.settings"
end

namespace :db do
    task :setup do
        if !Dir.exists?("web/.env") then
            Dir.chdir("web") do
                sh "python -m venv .env"
                sh ".env/bin/pip install wheel"
                sh ".env/bin/pip install -r requirements.txt"
            end
        end
    end

    task :makemigrations => :setup do
        django_manage "makemigrations"
        django_manage "migrate"
    end

    task :migrate => :setup do
        django_manage "migrate"
    end
end

namespace :deploy do
    task :production do
        sh "fab production merge deploy"
    end

    task :all => [
        :production,
    ]
end

namespace :gitpod do
    task :dumpdb => "db:migrate" do
        sh "docker exec -t bilingual-postgres-1 pg_dump --username=bilingual bilingual | gzip > gitpod/postgres.migrated.sql.gz"
    end
end
