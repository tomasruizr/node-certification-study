# 2 different exercices

## LoadBalancer
### If running on VsCode:
Run task 

`(cmd|ctrl) + shift + p --> Run Task --> loadBalancer` 

With the recommended extension `Rest Client`  and try the requests directly in the [test.http](./src/loadBalancer/test.http) file.
<br>

Otherwise just run

  `npm run loadBalancer`

go to [test.http](./src/loadBalancer/test.http) to see the possible requests.


## WebSocket chat
### If running on VsCode:
Run task 

`(cmd|ctrl) + shift + p --> Run Task --> webSocketChat` 

Otherwise just run

 `npm run wsService2`

and in other terminal

`npm run wsWebServer`

In either case: Now navigate to [http://localhost:8888](http://localhost:8888) and have fun.
It's better to open in several tabs to see the sockets connecting and interacting.