# rabbit-wrapper
High level library (base on [rabbot](https://github.com/arobson/rabbot)) to simplify the implementation of several messaging patterns on RabbitMQ.
this library wrapped rabbot and added some validation capabilities on received messages (such as jsonRPC validation).

## Example

```ts
import { RabbitmqWrapper } from 'rabbit-wrapper';

interface IMsgBody {
  test: string;
}

// Need to wrapper in async function
await RabbitmqWrapper.initialize({
  defaultExchange: 'test',
  connection: {
        user: "guest",
        pass: "guest",
        server: "127.0.0.1",
        port: 5672
  }
});

RabbitmqWrapper.addValidateHandler<IMsgBody>('queueName', handler, validator, errorHandler);

RabbitmqWrapper.addRPCValidateHandler<IMsgBody>('queueName', rpcHandler, validator, rpcErrorHandler);

try {
  const res = await RabbitmqWrapper.highLevelRequest<IMsgBody>(({data: 'testData'}, 'routingKey', validator);
  // response is valid (matched to IMsgBody)
  console.log(res.test);
  res.ack();
}
catch {
  console.log('the response data is not valid (not include test property)');
}

function validator(data: any): boolean {
    if (data.test && typeof data.test === 'string')
      return true;
    else 
      throw new Error('received data is not valid');
}

// Fired when new jsonRpc valid received
function rpcHandler(msg: IMsgJsonRpcRequest<IMsgBody>): void {
  // the data is valid jsonRpc, Do something...
}

// Fired when new valid data received
function handler(msg: IMsgBody): void {
  // the received data is valid Do something...
}

// Fired when validator function will throw an error
function errorHandler (error: string, msg: IMsg): void {
  console.log(error);
}

// Fired when validator function will throw an error or when the received data is not matched to jsonRpc standard
function rpcErrorHandler (error: string, msg: IMsg): void {
  console.log(error);
}
```


