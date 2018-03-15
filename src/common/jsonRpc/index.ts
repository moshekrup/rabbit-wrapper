import { IMsg } from 'rabbot';
import RpcError  from './error';

export { RpcError };
export const JSON_RPC_VERSION = "2.0";
export type JsonRpcVersion = "2.0";

export interface IJsonRpcError<T> {
    code: number;
    message: string,
    data?: T;
}

export interface IJsonRpcRequest<T> {
    jsonrpc: JsonRpcVersion;
    method: string;
    params: T;
    id?: string | number | undefined;
}

export interface IJsonRpcResponse {
    jsonrpc: JsonRpcVersion;
    id?: string | number | void,
}

export interface IJsonRpcSuccess<T> extends IJsonRpcResponse {
    result: T;
}

export interface IJsonRpcFailure<T> extends IJsonRpcResponse {
    error: IJsonRpcError<T>;
}

export interface IMsgJsonRpcRequest<T> extends IMsg {
    body: IJsonRpcRequest<T>
}

export interface IMsgRpcSuccess<T> extends IMsg {
    body: IJsonRpcSuccess<T>;
}

export interface IValidator<T> {
    // should throw an error if failed to validate
    (data: any): data is T;
}

export class JsonRpc {
    static validateResponse<T>(body: any, validatorResult: IValidator<T>): body is IJsonRpcSuccess<T> {
        const PREFIX_MSG = "Json rpc response is not valid, ";
        let msg = undefined;

        // Check if the response includes error object
        msg = JsonRpc._checkError(body);

        if (body.jsonrpc !== JSON_RPC_VERSION) {
            msg ? msg += "\n and ": PREFIX_MSG;
            msg = `it must includes 'jsonrpc' property as string of ${JSON_RPC_VERSION}`;
        }
        if (body.result && body.error) {
            msg ? msg += "\n and ": PREFIX_MSG;
            msg += "it can hold only 'error' or 'result' in the same time"; 
        }
        if (!body.result && !body.error) {
            msg ? msg += "\n and ": PREFIX_MSG;
            msg += "it must hold 'error' or 'result' property"; 
        }
        
        if (msg)
            throw new RpcError(msg, body);
        
        return validatorResult((body as IJsonRpcSuccess<any>).result);
    }

    static validateRequest<T>(body: any, validatorParams: IValidator<T>): body is IJsonRpcRequest<T> {
        let msg: string | undefined = undefined;
        if (body.jsonrpc !== JSON_RPC_VERSION)
            msg = `it must includes 'jsonrpc' property as string of ${JSON_RPC_VERSION}`
        if (typeof body.method != 'string') {
            msg ? msg += "\n and ": "";
            msg += "jsonRpc must includes 'method' property as string" 
        }
        if (!body.params) {
            msg ? msg += "\n and ": "";
            msg = "jsonRpc must includes 'params' property";
        }
        if (body.id) {
            let id = body.id;
            if (typeof id != 'string' && typeof id != 'number' && typeof id != null) {
                msg ? msg += "\n and ": "";
                msg += "'id' property must be string | number | null";
            }
        }
    
        if (msg)
            throw new RpcError(msg, body);
        
        return validatorParams((body as IJsonRpcRequest<any>).params);
    }

    private static _checkError(body: any): string | undefined {
        const PREFIX_MSG = "json rpc error response, ";
        let msg = undefined;
        if (body.error) {
            let error = body.error;
            // TODO: add error code
            if (error.message && error.message === 'string') {
                msg = `${PREFIX_MSG} message: ${error.message}`;
            }

            if (error.data) 
                msg += `data: ${JSON.stringify(error.data)}`
        }

        return msg;
    }
}
