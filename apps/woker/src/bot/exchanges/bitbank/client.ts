import { PublicRestClient, RestClient } from '@pokooo/bb-api'

export class BitbankClient {
  readonly public: PublicRestClient
  readonly private: RestClient

  constructor(apiKey?: string, apiSecret?: string) {
    this.public  = new PublicRestClient()
    this.private = new RestClient({ key: apiKey, secret: apiSecret })
  }
}
