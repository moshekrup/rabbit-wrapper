declare module rabbot {
    interface IQueueOptions {
        autoDelete?: boolean; // delete when consumer count goes to 0
        durable?: boolean; // survive broker restart
        exclusive?: boolean // limits queue to the current connection only (danher)
        subscribe?: boolean; // auto-start the subscription
        limit?: number; // max number of unacked messages allowed for consumer
        noAck?: boolean; // the server will remove messages from the queue as soon as they are delivered
        noBatch?: boolean; // causes ack, nack & reject to take place immediately
        noCacheKeys?: boolean;
        queueLimit?: number; // max number of ready messages a queue can hold
        messageTtl?: number; // time in ms before a messages expires on the queue
        expires?: number; // time in ms before a queue with 0 consumers expires
        deadLetter?: string; // the echange to dead-latter messages to
        deadLetterRoutingKey?: string;
        maxPriority?: number;
        unique?: 'hash'|'id'|'consistent';
    }

    interface IQueueConfigOptions extends IQueueOptions {
        name: string;
    }

    interface IExchangeOptions {
        autoDelete?: boolean;
        durable?: boolean;
        persistent?: boolean;
        alternate?: string;
        publishTimeout?: number;
        replyTimeout?: number;
        limit?: number;
    }

    interface IExchagneConfigOptions extends IExchangeOptions{
        name: string;
        type: 'direct' | 'fanout' | 'topic';
    }

    interface IBindingOptions {
        exchange: string;
        target: string;
        keys: string | string[];
    }

    interface IConnectionOptions {
        uri?: string;
        server: string | string[];
        port: number;
        user: string;
        pass: string;
        name?:string;
        vhost?: string;
        protocol?: string;
        timeout?: number;
        heartbeat?: number;
        replyQueue?: string | object;
        publishTimeout?: number;
        replyTimeout?: number;
        failAfter?: number;
        retryLimit?: number;
    }

    interface IPublishOptions {
        routingKey?: string;
		type?: string;
		correlationId?: string;
		contentType?: string;
		body?: object; //check
		messageId?: string;
		expiresAfter?: number;
		timestamp?:  number;
		mandatory?: boolean;
		persistent?: boolean;
		headers?: object;
		timeout?: number;
    }

    interface IRequestOptions extends IPublishOptions {
        replyTimeout?: number;
    }

    interface IFieldsMsg {
        consumerTag: string;
		deliveryTag: string;
		redelivered: boolean;
		exchange: string;
		routingKey: string;
    }

    interface IPropertiesMsg {
        contentType: string;
		contentEncoding: string;
		headers: object;
		correlationId: string;
		replyTo: string;
		messageId: string;
		type: string;
        appId: string;
        clusterId: string;
        deliveryMode: number;
        expiration: any;
        priority: number;
        userId: string;
    }

    interface IReplyMsgOptions {
        more?: boolean;
        replyType?: string;
        contentType?: any; //check
        headers?: object;
    }

    interface IMsg {
        fields: IFieldsMsg;
        properties: IPropertiesMsg;
        body: any;
        type: string;
        content: any;
        queue: string;
        ack(): void;
        nack(): void;
        reject(): void;
        reply(msg: any, options?: IReplyMsgOptions): void
    }

    interface IHandleMsgOptions {
        queue: string
        type?: string;
        autoNack?: boolean;
        context?: any;
        handler?: IHandle;
    }

    interface IHandlerReply {
        remove(): void;
        cacheKeys: string[];
        callback: any;
        channel:string;
        pipeline: any[]
        topic: string;
    }

    interface IConfig {
        connection: IConnectionOptions;
        exchanges?: IExchagneConfigOptions[];
        queues?: IQueueConfigOptions[];
        bindings?: IBindingOptions[];
        // change it
        logging?: {
            adapters: {
                stdOut: {
                    level: number;
					bailIfDebug: boolean;

                }
            }
        }
    }

    interface IConnectionDetails {
        channels: object;
        connection: any;
        definitions: object;
        name: string;
        onReturned: IHandle
        onUnhandled: IHandle
        options: IConnectionOptions;
        promise: any
        promises: object;
        replyQueue: object;
        serializers: object;
    }

    interface IHandle {
        (msg: IMsg): void;
    }
    
    function configure(config: IConfig): Promise<void>;

    export function addConnection(options: IConnectionOptions): Promise<IConnectionDetails>;
    
    function addQueue(name: string, options?: IQueueOptions, connectionName?: string): Promise<any>;

    function bindQueue(source: string, target: string, keys: string | string[], connectionName?: string): Promise<void>;

    function handle(messageType: string, handler: IHandle, queueName: string, context?: any): IHandlerReply;

    function handle(options: IHandleMsgOptions, handler: IHandle): IHandlerReply;
        
    function publish(exchangeName: string, options?: IPublishOptions, connectionName?: string): Promise<void>;

    function request(exchangeName: string, options: IRequestOptions, connectionName?: string): Promise<IMsg>;

    function startSubscription(queueName: string, exclusive?: boolean, connectionName?: any): Promise<void>;
         
    function stopSubscription(queueName: string, connectionName?: string): Promise<void>;

    function onUnhandled(handler: IHandle): void;

    function shutdown(): Promise<void>;
    // not implements
    function addExchange(name: any, type: any, options: any, connectionName: any): any;

    function addSerializer(contentType: any, serializer: any): void;
        
    function batchAck(): void;
        
    function bindExchange(source: any, target: any, keys: any, connectionName: any): any;
        
    function clearAckInterval(): void;
        
    function close(connectionName?: string, reset?: boolean): any;
        
    function closeAll(reset: any): any;
        
    function deleteExchange(name: any, connectionName: any): any;
        
    function deleteQueue(name: any, connectionName: any): any;
        
    function emit(topic: any, data: any): void;
        
    function getEnvelope(topic: any, data: any): any;
        
    function getExchange(name: any, connectionName: any): any;
        
    function getQueue(name: any, connectionName: any): any;
        
    function ignoreHandlerErrors(): void;
        
    function nackOnError(): void;
        
    function nackUnhandled(): void;
        
    function off(topic: any, context: any, ...args: any[]): void;
        
    function on(topic: any, callback: any): any;
        
    function onReturned(handler: any): void;
        
    function once(topic: any, callback: any): any;
        
    function rejectUnhandled(): void;

    function reset(): void;
        
    function retry(connectionName: any): any;
        
    function setAckInterval(interval: any): void;
}

declare module 'rabbot' {
    export = rabbot;
}
