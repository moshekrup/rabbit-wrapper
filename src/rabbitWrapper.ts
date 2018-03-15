/// <reference path="../typings/rabbot.d.ts"/>
import * as rabbot from 'rabbot';
import { IHandleMsgOptions, IQueueOptions, IHandle, IRequestOptions,
    IConfig, IPublishOptions, IMsg, IConnectionOptions, IBulkPublicOptions, IHashPublishBulkFormat } from 'rabbot';
import { IJsonRpcFailure, IJsonRpcRequest, 
    IJsonRpcError, JsonRpc, IMsgJsonRpcRequest, RpcError, IJsonRpcResponse, IJsonRpcSuccess, IMsgRpcSuccess, IValidator } from './common/jsonRpc';

export { IHandle, IMsg, IQueueOptions };
export { IJsonRpcError, IJsonRpcFailure, IJsonRpcRequest, 
    JsonRpc, IMsgJsonRpcRequest, RpcError, IJsonRpcResponse, IJsonRpcSuccess, IMsgRpcSuccess };

export interface IConnectionResult {
    name: string;
    options: IConnectionOptions;
}

export interface IQueueResult {
    name: string;
    state: string;
    connectionName: string;
    receivedCount: number;
}

export interface IHandleResult {
    topic: string,
    cancelHandle: () => void
}

export interface IConfigInit extends IConfig {
    defaultExchange: string;
}

export interface IRpcValidHandle<T> {
    (msg: IMsgJsonRpcRequest<T>): void;
}

export interface IBodyValidateMsg<T> extends IMsg {
    body: T
}

export interface IMsgResponse<T> extends IMsg {
    body: T;
}

export interface IValidHandle<T> {
    (msg: IBodyValidateMsg<T>): void;
}

export interface IErrorHandle {
    (error: string, msg: IMsg): void;
}

export enum contentTypes {
    json = "application/json",
}

export class RabbitmqWrapper {
    private static _manualSubscribeQueues: string[] = [];
    private static _defaultExchange: string;

    /**
     * initialize connections
     * @param {string} queueName.
     * @param {IConfigInit} config
     */
    public static async initialize(config: IConfigInit): Promise<void> {
        RabbitmqWrapper._defaultExchange = config.defaultExchange;
        await rabbot.configure(config as IConfig);
    }

    public static async addConnection(options: IConnectionOptions): Promise<IConnectionResult> {
        const result = await rabbot.addConnection(options);
        return {
            name: result.name,
            options: result.options
        }
    }

    /**
     * bind queue to specific exchange (by spesific | list of key/s)
     * @param targetQueue the queue to bind
     * @param routingKeys spesific rouning key (or list of keys)
     * @param sourceExchange source exchange
     */
    public static async bindQueue(targetQueue: string, routingKeys: string | string[], sourceExchange = RabbitmqWrapper._defaultExchange): Promise<void> {
        await rabbot.bindQueue(sourceExchange, targetQueue, routingKeys);
    }

    /**
     * /**
     * Add queue to rabbitmq broker
     * Note: if subscribe=false, nedded to subscribe it manually with subscribeManualQueues method,
     *       the reason to set it to false is because you need to call addHandler method before subscriber will be started 
     *       (see below addHandler description)
     * @param queueName
     * @param limit max number of unacked messages allowed for consumer, the default is 100
     * @param queueLimit max number of ready messages a queue can hold, the default is 1000
     * @param autoDelete // delete when consumer count goes to 0, default false
     * @param durable // survive broker restart, the default is true
     * @param noBatch // causes ack, nack & reject to take place immediately, default true 
     * @param exclusive // limits queue to the current connection only, default false
     * @param autoSubscribe // auto-start the subscription, the default is false
     */
    public static async addQueue(queueName: string, limit = 100, queueLimit = 10000, autoDelete = false, durable = true, noBatch = true, exclusive = false, autoSubscribe = false) : Promise<IQueueResult> {
        const options = { 
            limit, 
            queueLimit, 
            autoDelete, 
            durable, 
            noBatch,
            exclusive, 
            subscribe: autoSubscribe
        }

        const result = await rabbot.addQueue(queueName, options);
        if (!autoSubscribe)
            RabbitmqWrapper._addToManualSubscribeList(queueName);
        return {
            name: result.receivedMessages.name,
            state: result.state,
            connectionName: result.receivedMessages.connectionName,
            receivedCount: result.receivedCount
        }
    }

    /**
     * The publish call returns a promise that is only resolved once the broker has accepted responsibility for the message.
     * @param {string} exchange exchange name.
     * @param {object} body json contents.
     * @param {string} routingKey routing key
     * @param {boolean} persistent If either message or exchange defines persistent=true queued messages will be saved to disk.
     * @param {number} timeout ms to wait before cancelling the publish and rejecting the promise
     * @param {string} exchange
     */
    public static async publish(body: object, routingKey: string, timeout?: number, persistent = true, exchange = RabbitmqWrapper._defaultExchange): Promise<void> {
        const options: IPublishOptions = {
            contentType: contentTypes.json,
            routingKey,
            body,
            persistent,
            timeout,
        };

        await rabbot.publish(exchange, options);
    }

    public static async bulkPublish(options: IBulkPublicOptions[] | IHashPublishBulkFormat): Promise<void> {
        await rabbot.bulkPublish(options);
    }

    /**
     * From Rabbot docs: This works just like a publish except that the promise returned provides the response (or responses) from the other side.
     * A replyTimeout and limit is available in the options
     * before removing the subscription for the request to prevent memory leaks.
     * NOTE: There are two required fields in order for the reply queue to read the pick up on the message.
     *  ('reply' method (in message object) wrapper it for you, the fields needed when yot dont use this method)
     *  The headers must contain a sequence_end=true field
     *  And the message properties must contain a correlationId field that is the messageId of the outgoing message.
     * @param replyTimeout ms to wait before cancelling the publish and rejecting the promise
     * @param limit will stop after 3 even if many more reply.
    */
    public static async request(body: object, routingKey: string, replyTimeout?: number, limit?: number, persistent = true, exchange = RabbitmqWrapper._defaultExchange): Promise<IMsg> {
        const options: IRequestOptions = {
            contentType: contentTypes.json,
            routingKey,
            body,
            persistent,
            replyTimeout,
            limit
        };

        return await rabbot.request(exchange, options);
    }

    /**
     * High level rpc request (see request description)
     * this function get T that defined expected result structure (in json rpc body), 
     * the function results is promise of IJsonRpcSuccess<T>
     * NOTE: the promise will be rejected in one of the following casses: 
     *  the response body is not match to rpc standard 
     *  the responses body includes rpc error (like IJsonRpcError interface)
     *  the 'result' property in body response is not match to expected T
     * @param body body of the request
     * @param routingKey routing key
     * @param validatorRPCResult function that check if the response is valid json rpc and if the 'result' property 
     *  in the json rpc match to expected structure (the validator func should throw an error if faild to validate)
     * @param replyTimeout ms to wait before cancelling the publish and rejecting the promise
     * @param persistent If either message or exchange defines persistent=true queued messages will be saved to disk.
     * @param exchange 
     */
    public static async highLevelRPCRequest<T>(body: object, routingKey: string, validatorRPCResult: IValidator<T>, 
        replyTimeout?: number, limit?: number, persistent = true, exchange = RabbitmqWrapper._defaultExchange): 
        Promise<IMsgRpcSuccess<T>> {
            const validatorRpcRes = (body: any): body is IJsonRpcSuccess<T> => 
                JsonRpc.validateResponse(body, validatorRPCResult);
            return RabbitmqWrapper.highLevelRequest(
                body, 
                routingKey, 
                validatorRpcRes, 
                replyTimeout, 
                limit, 
                persistent, 
                exchange
            );
    }

    public static async highLevelRequest<T>(body: object, routingKey: string, validator: IValidator<T>, 
        replyTimeout?: number, limit?: number, persistent = true, 
        exchange = RabbitmqWrapper._defaultExchange): Promise<IMsgResponse<T>> {
            const res = await RabbitmqWrapper.request(body, routingKey, replyTimeout, limit, persistent, exchange);
            validator(res.body);
            return res as IMsgResponse<T>;
    }

    /**
     * The default behavior is that any message received that doesn't have
     * any elligible handlers will get nack'd and sent back to the queue immediately,
     * you can change this behavior by call this method.
    */
    public static onUnhandled(handle: IHandle): void {
        rabbot.onUnhandled(handle);
    }
    
    /**
     * Message handlers are registered to handle a message based on the queueName
     * The message that is passed to the handler is the raw Rabbit payload
     * The body property contains the message body published. 
     * The message has ack, nack (requeue the message), reply and reject (don't requeue the message) 
     * methods control what Rabbit does with the message.
     * NOTE: important that Handle calls should happen before starting subscriptions.
    */
    public static addHandler(queue: string, handle: IHandle, autoNack = true): IHandleResult {
        const options: IHandleMsgOptions = {
            queue: queue, // only handle messages from the queue with this name
            autoNack: autoNack, // automatically handle exceptions thrown in this handler
        }

        const result = rabbot.handle(options, handle);

        return {
            topic: result.topic,
            cancelHandle: result.remove
        };
    }

    public static async shutdown(): Promise<void> {
        await rabbot.shutdown();
    }

    /**
     * High level function for add handler to specific key
     * this function create queue(with default params) bind it to exchange and add handler to the created queue.
     * Note : the name of queue that will be created is like the given key
    */
    public static async addHighLevelHandler(key: string, handler: IHandle, exchange = RabbitmqWrapper._defaultExchange): Promise<IHandleResult> {
        await RabbitmqWrapper.addQueue(key);
        await RabbitmqWrapper.bindQueue(key, key, exchange);
        return RabbitmqWrapper.addHandler(key, handler);
    }

    /**
     * High level function for add handler to specific key and execute validate rpc on received data (throw error if it is not jsonRpc standard)
     * Note: the invalidHandle will be fired in one of the following casses: 
     *  the message is not match to rpc standard 
     *  the message includes rpc error (like IJsonRpcError interface)
     *  the 'params' property in rpc body is not match to expected T
     * @param handler The message (as IMsgJsonRpcRequest<T>) that is passed to the handler is the raw Rabbit payload, The body property contains the message body published (params is the given T).
     * @param validatorParams Validator function, Get IJsonRpcRequest<any> and return IJsonRpcRequest<T> if the params are T, (the validator func should throw an error if faild to validate).
     * @param invalidHandle func that fired when throw an error.
    */
    public static async addRPCValidateHandler<T>(key: string, handler: IRpcValidHandle<T>, validatorParams: IValidator<T>, invalidHandle: IErrorHandle, exchange = RabbitmqWrapper._defaultExchange): Promise<IHandleResult> {
        const validatorRPC = (body: any): body is IJsonRpcRequest<T> => JsonRpc.validateRequest(body, validatorParams);
        return RabbitmqWrapper.addHighLevelHandler(
            key, 
            RabbitmqWrapper._validateBodyHandle(handler, validatorRPC, invalidHandle)
        );
    }

     /**
     * High level function for add handler to specific key and validate received data
     * @param handler The message that is passed to the handler is the raw Rabbit payload, The body property contains the message body published as T.
     * @param validator Validator function (the validator func should throw an error if faild to validate).
     * @param invalidHandle func that fired when throw an error.
     */
    public static async addValidateHandler<T>(key: string, handler: IValidHandle<T>, validator: IValidator<T>, invalidHandle: IErrorHandle, exchange = RabbitmqWrapper._defaultExchange): Promise<IHandleResult> {
        return RabbitmqWrapper.addHighLevelHandler(
            key, 
            RabbitmqWrapper._validateBodyHandle(handler, validator, invalidHandle)
        );
    }

    /**
     * Starts a consumer on the list of manualSubscribesQueues.
    */
    public static async subscribeManualQueues(): Promise<void> {
        for (let queue of RabbitmqWrapper._manualSubscribeQueues) {
            await rabbot.startSubscription(queue);
        }
    }

    private static _validateBodyHandle<T>(handle: IValidHandle<T>, validator: IValidator<T>, invalidHandle: IErrorHandle): IHandle {
        return function(msg: IMsg): void {
            try {
                validator(msg.body);
                handle(msg);
            }
            catch (error) {
                invalidHandle(error, msg);
            }
        } 
    }

    private static _addToManualSubscribeList(queue: string): void {
        if (RabbitmqWrapper._manualSubscribeQueues.indexOf(queue) < 0)
            RabbitmqWrapper._manualSubscribeQueues.push(queue);
    }
}