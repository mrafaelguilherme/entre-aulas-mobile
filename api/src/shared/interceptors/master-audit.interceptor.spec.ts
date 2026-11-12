import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { of } from 'rxjs';
import { MasterAuditInterceptor } from './master-audit.interceptor';

function createContext(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const next: CallHandler = { handle: () => of('response') };

describe('MasterAuditInterceptor', () => {
  const interceptor = new MasterAuditInterceptor();
  let log: jest.SpyInstance;

  beforeEach(() => {
    log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('logs method, route, actor and target id of a write by the master, never the body', () => {
    const request = {
      method: 'PUT',
      url: '/teachers/abc123?x=1',
      route: { path: '/teachers/:id' },
      params: { id: 'abc123' },
      body: { name: 'Nome Secreto' },
      user: { id: 'master-id', role: 'master' },
    };

    interceptor.intercept(createContext(request), next);

    expect(log).toHaveBeenCalledTimes(1);
    const message = String(log.mock.calls[0][0]);
    expect(message).toContain('PUT /teachers/:id by master-id on abc123');
    expect(message).not.toContain('Nome Secreto');
  });

  it('logs nothing for a read by the master or for a write by a teacher', () => {
    interceptor.intercept(
      createContext({
        method: 'GET',
        url: '/teachers',
        user: { id: 'master-id', role: 'master' },
      }),
      next,
    );
    interceptor.intercept(
      createContext({
        method: 'POST',
        url: '/posts',
        user: { id: 'ana-id', role: 'teacher' },
      }),
      next,
    );

    expect(log).not.toHaveBeenCalled();
  });

  it('passes the response through', (done) => {
    interceptor
      .intercept(createContext({ method: 'GET', url: '/posts' }), next)
      .subscribe((value) => {
        expect(value).toBe('response');
        done();
      });
  });
});
