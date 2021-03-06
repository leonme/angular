/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {NgIf} from '@angular/common';
import {CompilerConfig, XHR} from '@angular/compiler';
import {CUSTOM_ELEMENTS_SCHEMA, Component, ComponentFactoryResolver, ComponentMetadata, Directive, DirectiveMetadata, HostBinding, Injectable, Input, NgModule, NgModuleMetadata, Pipe, PipeMetadata, ViewMetadata, provide} from '@angular/core';
import {TestBed, TestComponentBuilder, addProviders, async, fakeAsync, inject, tick, withModule, withProviders} from '@angular/core/testing';
import {expect} from '@angular/platform-browser/testing/matchers';

import {stringify} from '../../http/src/facade/lang';
import {PromiseWrapper} from '../../http/src/facade/promise';

// Services, and components for the tests.

@Component(
    {selector: 'child-comp', template: `<span>Original {{childBinding}}</span>`, directives: []})
@Injectable()
class ChildComp {
  childBinding: string;
  constructor() { this.childBinding = 'Child'; }
}

@Component({selector: 'child-comp', template: `<span>Mock</span>`})
@Injectable()
class MockChildComp {
}

@Component({
  selector: 'parent-comp',
  template: `Parent(<child-comp></child-comp>)`,
  directives: [ChildComp]
})
@Injectable()
class ParentComp {
}

@Component({selector: 'my-if-comp', template: `MyIf(<span *ngIf="showMore">More</span>)`})
@Injectable()
class MyIfComp {
  showMore: boolean = false;
}

@Component({selector: 'child-child-comp', template: `<span>ChildChild</span>`})
@Injectable()
class ChildChildComp {
}

@Component({
  selector: 'child-comp',
  template: `<span>Original {{childBinding}}(<child-child-comp></child-child-comp>)</span>`,
  directives: [ChildChildComp]
})
@Injectable()
class ChildWithChildComp {
  childBinding: string;
  constructor() { this.childBinding = 'Child'; }
}

@Component({selector: 'child-child-comp', template: `<span>ChildChild Mock</span>`})
@Injectable()
class MockChildChildComp {
}

class FancyService {
  value: string = 'real value';
  getAsyncValue() { return Promise.resolve('async value'); }
  getTimeoutValue() {
    return new Promise(
        (resolve, reject) => { setTimeout(() => { resolve('timeout value'); }, 10); });
  }
}

class MockFancyService extends FancyService {
  value: string = 'mocked out value';
}

@Component({
  selector: 'my-service-comp',
  providers: [FancyService],
  template: `injected value: {{fancyService.value}}`
})
class TestProvidersComp {
  constructor(private fancyService: FancyService) {}
}

@Component({
  selector: 'my-service-comp',
  viewProviders: [FancyService],
  template: `injected value: {{fancyService.value}}`
})
class TestViewProvidersComp {
  constructor(private fancyService: FancyService) {}
}

@Directive({selector: '[someDir]', host: {'[title]': 'someDir'}})
class SomeDirective {
  @Input()
  someDir: string;
}

@Pipe({name: 'somePipe'})
class SomePipe {
  transform(value: string): any { return `transformed ${value}`; }
}

@Component({selector: 'comp', template: `<div  [someDir]="'someValue' | somePipe"></div>`})
class CompUsingModuleDirectiveAndPipe {
}

@NgModule()
class SomeLibModule {
}

@Component({
  selector: 'comp',
  templateUrl: '/base/modules/@angular/platform-browser/test/static_assets/test.html'
})
class CompWithUrlTemplate {
}

export function main() {
  describe('using the async helper', () => {
    var actuallyDone: boolean;

    beforeEach(() => { actuallyDone = false; });

    afterEach(() => { expect(actuallyDone).toEqual(true); });

    it('should run normal tests', () => { actuallyDone = true; });

    it('should run normal async tests', (done: any /** TODO #9100 */) => {
      setTimeout(() => {
        actuallyDone = true;
        done();
      }, 0);
    });

    it('should run async tests with tasks',
       async(() => { setTimeout(() => { actuallyDone = true; }, 0); }));

    it('should run async tests with promises', async(() => {
         var p = new Promise((resolve, reject) => { setTimeout(resolve, 10); });
         p.then(() => { actuallyDone = true; });
       }));
  });

  describe('using the test injector with the inject helper', () => {
    describe('setting up Providers', () => {
      beforeEach(() => addProviders([{provide: FancyService, useValue: new FancyService()}]));

      it('should use set up providers', inject([FancyService], (service: any /** TODO #9100 */) => {
           expect(service.value).toEqual('real value');
         }));

      it('should wait until returned promises',
         async(inject([FancyService], (service: any /** TODO #9100 */) => {
           service.getAsyncValue().then(
               (value: any /** TODO #9100 */) => { expect(value).toEqual('async value'); });
           service.getTimeoutValue().then(
               (value: any /** TODO #9100 */) => { expect(value).toEqual('timeout value'); });
         })));

      it('should allow the use of fakeAsync',
         fakeAsync(inject([FancyService], (service: any /** TODO #9100 */) => {
           var value: any /** TODO #9100 */;
           service.getAsyncValue().then(function(val: any /** TODO #9100 */) { value = val; });
           tick();
           expect(value).toEqual('async value');
         })));

      it('should allow use of "done"', (done: any /** TODO #9100 */) => {
        inject([FancyService], (service: any /** TODO #9100 */) => {
          let count = 0;
          let id = setInterval(() => {
            count++;
            if (count > 2) {
              clearInterval(id);
              done();
            }
          }, 5);
        })();  // inject needs to be invoked explicitly with ().
      });

      describe('using beforeEach', () => {
        beforeEach(inject([FancyService], (service: any /** TODO #9100 */) => {
          service.value = 'value modified in beforeEach';
        }));

        it('should use modified providers',
           inject([FancyService], (service: any /** TODO #9100 */) => {
             expect(service.value).toEqual('value modified in beforeEach');
           }));
      });

      describe('using async beforeEach', () => {
        beforeEach(async(inject([FancyService], (service: any /** TODO #9100 */) => {
          service.getAsyncValue().then(
              (value: any /** TODO #9100 */) => { service.value = value; });
        })));

        it('should use asynchronously modified value',
           inject([FancyService], (service: any /** TODO #9100 */) => {
             expect(service.value).toEqual('async value');
           }));
      });
    });

    describe('per test providers', () => {
      it('should allow per test providers',
         withProviders(() => [{provide: FancyService, useValue: new FancyService()}])
             .inject([FancyService], (service: any /** TODO #9100 */) => {
               expect(service.value).toEqual('real value');
             }));

      it('should return value from inject', () => {
        let retval = withProviders(() => [{provide: FancyService, useValue: new FancyService()}])
                         .inject([FancyService], (service: any /** TODO #9100 */) => {
                           expect(service.value).toEqual('real value');
                           return 10;
                         })();
        expect(retval).toBe(10);
      });
    });
  });

  describe('using the test injector with modules', () => {
    let moduleConfig = {
      providers: [FancyService],
      imports: [SomeLibModule],
      declarations: [SomeDirective, SomePipe, CompUsingModuleDirectiveAndPipe],
    };

    describe('setting up a module', () => {
      beforeEach(() => TestBed.configureTestingModule(moduleConfig));

      it('should use set up providers', inject([FancyService], (service: FancyService) => {
           expect(service.value).toEqual('real value');
         }));

      it('should be able to create any declared components', () => {
        const compFixture = TestBed.createComponent(CompUsingModuleDirectiveAndPipe);
        expect(compFixture.componentInstance).toBeAnInstanceOf(CompUsingModuleDirectiveAndPipe);
      });

      it('should use set up directives and pipes', () => {
        const compFixture = TestBed.createComponent(CompUsingModuleDirectiveAndPipe);
        let el = compFixture.debugElement;

        compFixture.detectChanges();
        expect(el.children[0].properties['title']).toBe('transformed someValue');
      });

      it('should use set up imported modules',
         inject([SomeLibModule], (libModule: SomeLibModule) => {
           expect(libModule).toBeAnInstanceOf(SomeLibModule);
         }));

      describe('provided schemas', () => {
        @Component({template: '<some-element [someUnknownProp]="true"></some-element>'})
        class ComponentUsingInvalidProperty {
        }

        beforeEach(() => {
          TestBed.configureTestingModule(
              {schemas: [CUSTOM_ELEMENTS_SCHEMA], declarations: [ComponentUsingInvalidProperty]});
        });

        it('should not error on unknown bound properties on custom elements when using the CUSTOM_ELEMENTS_SCHEMA',
           () => {
             expect(TestBed.createComponent(ComponentUsingInvalidProperty).componentInstance)
                 .toBeAnInstanceOf(ComponentUsingInvalidProperty);
           });
      });
    });

    describe('per test modules', () => {
      it('should use set up providers',
         withModule(moduleConfig).inject([FancyService], (service: FancyService) => {
           expect(service.value).toEqual('real value');
         }));

      it('should use set up directives and pipes', withModule(moduleConfig, () => {
           let compFixture = TestBed.createComponent(CompUsingModuleDirectiveAndPipe);
           let el = compFixture.debugElement;

           compFixture.detectChanges();
           expect(el.children[0].properties['title']).toBe('transformed someValue');
         }));

      it('should use set up library modules',
         withModule(moduleConfig).inject([SomeLibModule], (libModule: SomeLibModule) => {
           expect(libModule).toBeAnInstanceOf(SomeLibModule);
         }));
    });

    describe('components with template url', () => {
      beforeEach(async(() => {
        TestBed.configureTestingModule({declarations: [CompWithUrlTemplate]});
        TestBed.compileComponents();
      }));

      it('should allow to createSync components with templateUrl after explicit async compilation',
         () => {
           let fixture = TestBed.createComponent(CompWithUrlTemplate);
           expect(fixture.nativeElement).toHaveText('from external template\n');
         });
    });

    describe('overwrite metadata', () => {
      @Pipe({name: 'undefined'})
      class SomePipe {
        transform(value: string): string { return `transformed ${value}`; }
      }

      @Directive({selector: '[undefined]'})
      class SomeDirective {
        someProp = 'hello';
      }

      @Component({selector: 'comp', template: 'someText'})
      class SomeComponent {
      }

      @Component({selector: 'othercomp', template: 'someOtherText'})
      class SomeOtherComponent {
      }

      @NgModule({declarations: [SomeComponent, SomeDirective, SomePipe]})
      class SomeModule {
      }

      beforeEach(() => { TestBed.configureTestingModule({imports: [SomeModule]}); });

      describe('module', () => {
        beforeEach(() => {
          TestBed.overrideModule(SomeModule, {set: {declarations: [SomeOtherComponent]}});
        });
        it('should work', () => {
          expect(TestBed.createComponent(SomeOtherComponent).componentInstance)
              .toBeAnInstanceOf(SomeOtherComponent);
        });
      });

      describe('component', () => {
        beforeEach(() => {
          TestBed.overrideComponent(SomeComponent, {set: {selector: 'comp', template: 'newText'}});
        });
        it('should work', () => {
          expect(TestBed.createComponent(SomeComponent).nativeElement).toHaveText('newText');
        });
      });

      describe('directive', () => {
        beforeEach(() => {
          TestBed
              .overrideComponent(
                  SomeComponent, {set: {selector: 'comp', template: `<div someDir></div>`}})
              .overrideDirective(
                  SomeDirective, {set: {selector: '[someDir]', host: {'[title]': 'someProp'}}});
        });
        it('should work', () => {
          const compFixture = TestBed.createComponent(SomeComponent);
          compFixture.detectChanges();
          expect(compFixture.debugElement.children[0].properties['title']).toEqual('hello');
        });
      });

      describe('pipe', () => {
        beforeEach(() => {
          TestBed
              .overrideComponent(
                  SomeComponent, {set: {selector: 'comp', template: `{{'hello' | somePipe}}`}})
              .overridePipe(SomePipe, {set: {name: 'somePipe'}});
        });
        it('should work', () => {
          const compFixture = TestBed.createComponent(SomeComponent);
          compFixture.detectChanges();
          expect(compFixture.nativeElement).toHaveText('transformed hello');
        });
      });
    });

    describe('setting up the compiler', () => {

      describe('providers', () => {
        beforeEach(() => {
          let xhrGet = jasmine.createSpy('xhrGet').and.returnValue(Promise.resolve('Hello world!'));
          TestBed.configureCompiler({providers: [{provide: XHR, useValue: {get: xhrGet}}]});
        });

        it('should use set up providers',
           fakeAsync(inject([TestComponentBuilder], (tcb: TestComponentBuilder) => {
             let compFixture = tcb.createFakeAsync(CompWithUrlTemplate);
             expect(compFixture.nativeElement).toHaveText('Hello world!');
           })));
      });

      describe('useJit true', () => {
        beforeEach(() => { TestBed.configureCompiler({useJit: true}); });
        it('should set the value into CompilerConfig',
           inject([CompilerConfig], (config: CompilerConfig) => {
             expect(config.useJit).toBe(true);
           }));
      });
      describe('useJit false', () => {
        beforeEach(() => { TestBed.configureCompiler({useJit: false}); });
        it('should set the value into CompilerConfig',
           inject([CompilerConfig], (config: CompilerConfig) => {
             expect(config.useJit).toBe(false);
           }));
      });
    });
  });

  describe('errors', () => {
    var originalJasmineIt: any;
    var originalJasmineBeforeEach: any;

    var patchJasmineIt = () => {
      var deferred = PromiseWrapper.completer();
      originalJasmineIt = jasmine.getEnv().it;
      jasmine.getEnv().it = (description: string, fn: any /** TODO #9100 */) => {
        var done = () => { deferred.resolve(); };
        (<any>done).fail = (err: any /** TODO #9100 */) => { deferred.reject(err); };
        fn(done);
        return null;
      };
      return deferred.promise;
    };

    var restoreJasmineIt = () => { jasmine.getEnv().it = originalJasmineIt; };

    var patchJasmineBeforeEach = () => {
      var deferred = PromiseWrapper.completer();
      originalJasmineBeforeEach = jasmine.getEnv().beforeEach;
      jasmine.getEnv().beforeEach = (fn: any) => {
        var done = () => { deferred.resolve(); };
        (<any>done).fail = (err: any /** TODO #9100 */) => { deferred.reject(err); };
        fn(done);
        return null;
      };
      return deferred.promise;
    };

    var restoreJasmineBeforeEach =
        () => { jasmine.getEnv().beforeEach = originalJasmineBeforeEach; };

    it('should fail when an asynchronous error is thrown', (done: any /** TODO #9100 */) => {
      var itPromise = patchJasmineIt();
      var barError = new Error('bar');

      it('throws an async error',
         async(inject([], () => { setTimeout(() => { throw barError; }, 0); })));

      itPromise.then(
          () => { done.fail('Expected test to fail, but it did not'); },
          (err) => {
            expect(err).toEqual(barError);
            done();
          });
      restoreJasmineIt();
    });

    it('should fail when a returned promise is rejected', (done: any /** TODO #9100 */) => {
      var itPromise = patchJasmineIt();

      it('should fail with an error from a promise', async(inject([], () => {
           var deferred = PromiseWrapper.completer();
           var p = deferred.promise.then(() => { expect(1).toEqual(2); });

           deferred.reject('baz');
           return p;
         })));

      itPromise.then(
          () => { done.fail('Expected test to fail, but it did not'); },
          (err) => {
            expect(err.message).toEqual('Uncaught (in promise): baz');
            done();
          });
      restoreJasmineIt();
    });

    describe('using addProviders', () => {
      beforeEach(() => addProviders([{provide: FancyService, useValue: new FancyService()}]));

      beforeEach(inject([FancyService], (service: any /** TODO #9100 */) => {
        expect(service.value).toEqual('real value');
      }));

      describe('nested addProviders', () => {

        it('should fail when the injector has already been used', () => {
          patchJasmineBeforeEach();
          expect(() => {
            beforeEach(() => addProviders([{provide: FancyService, useValue: new FancyService()}]));
          })
              .toThrowError(
                  `Cannot configure the test module when the test module has already been instantiated. ` +
                  `Make sure you are not using \`inject\` before \`TestBed.configureTestingModule\`.`);
          restoreJasmineBeforeEach();
        });
      });
    });

    describe('components', () => {
      let xhrGet: jasmine.Spy;
      beforeEach(() => {
        xhrGet = jasmine.createSpy('xhrGet').and.returnValue(Promise.resolve('Hello world!'));
        TestBed.configureCompiler({providers: [{provide: XHR, useValue: {get: xhrGet}}]});
      });

      it('should report an error for declared components with templateUrl which never call TestBed.compileComponents',
         () => {
           var itPromise = patchJasmineIt();

           expect(
               () =>
                   it('should fail', withModule(
                                         {declarations: [CompWithUrlTemplate]},
                                         () => { TestBed.createComponent(CompWithUrlTemplate); })))
               .toThrowError(
                   `This test module uses the component ${stringify(CompWithUrlTemplate)} which is using a "templateUrl", but they were never compiled. ` +
                   `Please call "TestBed.compileComponents" before your test.`);

           restoreJasmineIt();
         });

    });

    it('should error on unknown bound properties on custom elements by default', () => {
      @Component({template: '<some-element [someUnknownProp]="true"></some-element>'})
      class ComponentUsingInvalidProperty {
      }

      var itPromise = patchJasmineIt();

      expect(
          () =>
              it('should fail',
                 withModule(
                     {declarations: [ComponentUsingInvalidProperty]},
                     () => { TestBed.createComponent(ComponentUsingInvalidProperty); })))
          .toThrowError(/Can't bind to 'someUnknownProp'/);

      restoreJasmineIt();
    });
  });

  describe('test component builder', function() {
    it('should instantiate a component with valid DOM',
       async(inject([TestComponentBuilder], (tcb: TestComponentBuilder) => {

         tcb.createAsync(ChildComp).then((componentFixture) => {
           componentFixture.detectChanges();

           expect(componentFixture.debugElement.nativeElement).toHaveText('Original Child');
         });
       })));

    it('should allow changing members of the component',
       async(inject([TestComponentBuilder], (tcb: TestComponentBuilder) => {

         tcb.createAsync(MyIfComp).then((componentFixture) => {
           componentFixture.detectChanges();
           expect(componentFixture.debugElement.nativeElement).toHaveText('MyIf()');

           componentFixture.debugElement.componentInstance.showMore = true;
           componentFixture.detectChanges();
           expect(componentFixture.debugElement.nativeElement).toHaveText('MyIf(More)');
         });
       })));

    it('should override a template',
       async(inject([TestComponentBuilder], (tcb: TestComponentBuilder) => {

         tcb.overrideTemplate(MockChildComp, '<span>Mock</span>')
             .createAsync(MockChildComp)
             .then((componentFixture) => {
               componentFixture.detectChanges();
               expect(componentFixture.debugElement.nativeElement).toHaveText('Mock');

             });
       })));

    it('should override a view',
       async(inject([TestComponentBuilder], (tcb: TestComponentBuilder) => {

         tcb.overrideView(
                ChildComp, new ViewMetadata({template: '<span>Modified {{childBinding}}</span>'}))
             .createAsync(ChildComp)
             .then((componentFixture) => {
               componentFixture.detectChanges();
               expect(componentFixture.debugElement.nativeElement).toHaveText('Modified Child');

             });
       })));

    it('should override component dependencies',
       async(inject([TestComponentBuilder], (tcb: TestComponentBuilder) => {

         tcb.overrideDirective(ParentComp, ChildComp, MockChildComp)
             .createAsync(ParentComp)
             .then((componentFixture) => {
               componentFixture.detectChanges();
               expect(componentFixture.debugElement.nativeElement).toHaveText('Parent(Mock)');

             });
       })));


    it('should override child component\'s dependencies',
       async(inject([TestComponentBuilder], (tcb: TestComponentBuilder) => {

         tcb.overrideDirective(ParentComp, ChildComp, ChildWithChildComp)
             .overrideDirective(ChildWithChildComp, ChildChildComp, MockChildChildComp)
             .createAsync(ParentComp)
             .then((componentFixture) => {
               componentFixture.detectChanges();
               expect(componentFixture.debugElement.nativeElement)
                   .toHaveText('Parent(Original Child(ChildChild Mock))');

             });
       })));

    it('should override a provider',
       async(inject([TestComponentBuilder], (tcb: TestComponentBuilder) => {

         tcb.overrideProviders(
                TestProvidersComp, [{provide: FancyService, useClass: MockFancyService}])
             .createAsync(TestProvidersComp)
             .then((componentFixture) => {
               componentFixture.detectChanges();
               expect(componentFixture.debugElement.nativeElement)
                   .toHaveText('injected value: mocked out value');
             });
       })));


    it('should override a viewProvider',
       async(inject([TestComponentBuilder], (tcb: TestComponentBuilder) => {

         tcb.overrideViewProviders(
                TestViewProvidersComp, [{provide: FancyService, useClass: MockFancyService}])
             .createAsync(TestViewProvidersComp)
             .then((componentFixture) => {
               componentFixture.detectChanges();
               expect(componentFixture.debugElement.nativeElement)
                   .toHaveText('injected value: mocked out value');
             });
       })));
  });
}
