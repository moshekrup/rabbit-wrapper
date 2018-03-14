# rabbit-wrapper
High level library (base on [rabbot](https://github.com/arobson/rabbot)) to simplify the implementation of several messaging patterns on RabbitMQ.
this library wrapped rabbot and added some validation capabilities on received messages (such as jsonRPC validation).

## API Example

```ts
import { rabbit } from 'rabbit-wrapper';

Interface IMsgBody {
  test: string;
}

// Need to wrapper in async function
await rabbit.initialize( 
  defaultExchange: 'test',
  connection: {
        user: "guest",
        pass: "guest",
        server: "127.0.0.1",
        port: 5672
  }
);

rabbit.addValidateHandler<IMsgBody>('queueName', handler, validator, errorHandler);

rabbit.addRPCValidateHandler<IMsgBody>('queueName', rpcHandler, validator, rpcErrorHandler);

try {
  const res = await rabbbit.highLevelRequest<IMsgBody>(({data: 'testData'}, 'routingKey', validator);
  // response is valid (matched to IMsgBody)
  console.log(res.test);
  res.ack();
}
catch {
  console.log('the response data is not valid (not include test property)');
}

validator(data: any): boolean {
    if (data.test && typeof data.test === 'string')
      return true;
    else 
      throw new Error('received data is not valid');
}

// Fired when new jsonRpc valid received
rpcHandler(msg: IMsgJsonRpcRequest<IMsgBody>): void {
  // the data is valid jsonRpc  Do something...
}

// Fired when new valid data received
handler(msg: IMsgBody): void {
  // the received data is valid Do something...
}

// Fired when validator function will throw an error
errorHandler (error: string, msg: IMsg): void {
  console.log(error);
}

// Fired when validator function will throw an error or when the received data is not matched to jsonRpc standard
rpcErrorHandler (error: string, msg: IMsg): void {
  console.log(error);
}
```


