/*!
 * Copyright 2016 Ron Buckton (rbuckton@chronicles.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Readable, Writable, PassThrough } from "stream";
import merge = require("merge2");
import ReadWriteStream = NodeJS.ReadWriteStream;
import ReadableStream = NodeJS.ReadableStream;
import WritableStream = NodeJS.WritableStream;
import ForkCallback = fork.ForkCallback;

function fork(): fork.Fork {
    return new fork.Fork();
}

namespace fork {
    interface MergeStream extends ReadWriteStream {
        add(...args: (ReadableStream | ReadableStream[])[]): this;
    }

    export type ForkCallback = (src: ReadableStream) => ReadableStream;

    export class Fork extends PassThrough {
        private _joins: (ForkCallback | ReadWriteStream)[][] | undefined;
        private _participants: (ForkCallback | ReadWriteStream)[] | undefined;
        private _source: NodeJS.ReadableStream | undefined;
        private _merge: MergeStream | undefined;

        constructor() {
            super({ objectMode: true });
            this.on("pipe", (source: ReadableStream) => this._onpipe(source));
            this.on("unpipe", (source: ReadableStream) => this._onunpipe(source));
        }

        /**
         * Adds a callback to execute and pipe through in parallel when the source is piped into
         * this stream.
         */
        add(fork: ForkCallback): this;

        /**
         * Adds a transform stream to pipe through in parallel when the source is piped into this
         * stream.
         */
        add(fork: ReadWriteStream): this;

        /**
         * Add callbacks to execute or transform streams to pipe through in parallel when the
         * source is piped into this stream.
         */
        add(...forks: (ForkCallback | ReadWriteStream)[]): this;

        /**
         * Add callbacks to execute or transform streams to pipe through in parallel when the
         * source is piped into this stream.
         */
        add(...forks: (ForkCallback | ReadWriteStream)[]) {
            if (this._participants === undefined) {
                this._participants = forks;
            }
            else {
                for (const fork of forks) this._participants.push(fork);
            }

            this._process();
            return this;
        }

        /**
         * Wait for all previous participants to complete before processing any additional forks
         * added after this point.
         */
        join() {
            if (this._participants) {
                if (this._merge === undefined) {
                    this._merge = merge() as MergeStream;
                }

                this._process();
            }

            if (this._participants !== undefined) {
                if (this._joins === undefined) {
                    this._joins = [this._participants];
                }
                else {
                    this._joins.push(this._participants);
                }

                this._participants = undefined;
            }

            return this;
        }

        /**
         * Implicitly joins all participants and pipes the merged results to the provided
         * destination.
         */
        pipe<T extends WritableStream>(destination: T, options?: { end?: boolean; }): T {
            if (this._merge === undefined) {
                this._merge = merge() as MergeStream;
            }

            this.join();
            return this._merge.pipe(destination, options);
        }

        private _onpipe(source: ReadableStream) {
            if (this._source) return;
            this._source = source;
            if (this._joins) {
                this._process();
            }
        }

        private _onunpipe(source: ReadableStream) {
            if (this._source === source) {
                this._source = undefined;
            }
        }

        private _process() {
            const source = this._source;
            const merge = this._merge;
            const joins = this._joins;
            if (source === undefined) return;
            if (merge === undefined) return;

            let participants = this._participants;
            while (participants) {
                merge.add(participants.map(fork => typeof fork === "function" ? fork(source) : source.pipe(fork)));
                participants = joins ? joins.shift() : undefined;
            }

            this._participants = undefined;
            this._joins = undefined;
        }
    }
}

export = fork;