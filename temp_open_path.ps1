$body = @{ path='C:\Users\USER\Eitan Shamir & Co\EISLAW TEAM - מסמכים\לקוחות משרד\לקוחות משרד_טמפלייטים' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://127.0.0.1:8799/dev/desktop/open_path' -Method Post -ContentType 'application/json' -Body $body
