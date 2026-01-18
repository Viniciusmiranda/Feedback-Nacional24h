import pty
import os
import time
import sys
import select

# Configuration
HOST = "vinicius@31.97.90.3"
PASS = "12f46g63H:)"
CMD = "cd /srv/app-avaliaja/backend && git pull && echo '12f46g63H:)' | sudo -S docker compose restart"

def deploy():
    print(f"Starting deployment to {HOST}...")
    
    pid, fd = pty.fork()
    
    if pid == 0:
        os.execvp("ssh", ["ssh", "-o", "StrictHostKeyChecking=no", HOST, CMD])
    else:
        password_sent = False
        output = b""
        
        while True:
            try:
                r, w, e = select.select([fd], [], [], 10)
                if not r: continue
                    
                data = os.read(fd, 1024)
                if not data: break
                
                output += data
                current_chunk = data.decode('utf-8', errors='ignore')
                sys.stdout.write(current_chunk)
                
                if "password:" in current_chunk.lower() and not password_sent:
                    print("\n[Script] Sending Password...")
                    os.write(fd, (PASS + "\n").encode())
                    password_sent = True
                    
            except OSError:
                break
                
        _, status = os.waitpid(pid, 0)
        exit_code = os.waitstatus_to_exitcode(status)
        
        print(f"\n[Script] Deployment finished with exit code: {exit_code}")

if __name__ == "__main__":
    deploy()
