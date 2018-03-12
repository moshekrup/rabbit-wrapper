export default class RpcError extends Error {
    public body: any;
    constructor(msg: string, body: any) {
        super(msg);
        this.body = body;
        this.name = 'EpcError';
    }
}