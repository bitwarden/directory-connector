import { Component, DebugElement } from "@angular/core";
import { ComponentFixture, TestBed, waitForAsync } from "@angular/core/testing";
import { By } from "@angular/platform-browser";

import { ButtonModule } from "./index";

describe("Button", () => {
  let fixture: ComponentFixture<TestApp>;
  let testAppComponent: TestApp;
  let buttonDebugElement: DebugElement;
  let linkDebugElement: DebugElement;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ButtonModule],
      declarations: [TestApp],
    });

    TestBed.compileComponents();
    fixture = TestBed.createComponent(TestApp);
    testAppComponent = fixture.debugElement.componentInstance;
    buttonDebugElement = fixture.debugElement.query(By.css("button"));
    linkDebugElement = fixture.debugElement.query(By.css("a"));
  }));

  it("should apply classes based on type", () => {
    testAppComponent.buttonType = "primary";
    fixture.detectChanges();
    expect(buttonDebugElement.nativeElement.classList.contains("tw-bg-primary-500")).toBe(true);
    expect(linkDebugElement.nativeElement.classList.contains("tw-bg-primary-500")).toBe(true);

    testAppComponent.buttonType = "secondary";
    fixture.detectChanges();
    expect(buttonDebugElement.nativeElement.classList.contains("tw-border-text-muted")).toBe(true);
    expect(linkDebugElement.nativeElement.classList.contains("tw-border-text-muted")).toBe(true);

    testAppComponent.buttonType = "danger";
    fixture.detectChanges();
    expect(buttonDebugElement.nativeElement.classList.contains("tw-border-danger-500")).toBe(true);
    expect(linkDebugElement.nativeElement.classList.contains("tw-border-danger-500")).toBe(true);

    testAppComponent.buttonType = null;
    fixture.detectChanges();
    expect(buttonDebugElement.nativeElement.classList.contains("tw-border-text-muted")).toBe(true);
    expect(linkDebugElement.nativeElement.classList.contains("tw-border-text-muted")).toBe(true);
  });

  it("should apply block when true and inline-block when false", () => {
    testAppComponent.block = true;
    fixture.detectChanges();
    expect(buttonDebugElement.nativeElement.classList.contains("tw-block")).toBe(true);
    expect(linkDebugElement.nativeElement.classList.contains("tw-block")).toBe(true);
    expect(buttonDebugElement.nativeElement.classList.contains("tw-inline-block")).toBe(false);
    expect(linkDebugElement.nativeElement.classList.contains("tw-inline-block")).toBe(false);

    testAppComponent.block = false;
    fixture.detectChanges();
    expect(buttonDebugElement.nativeElement.classList.contains("tw-inline-block")).toBe(true);
    expect(linkDebugElement.nativeElement.classList.contains("tw-inline-block")).toBe(true);
    expect(buttonDebugElement.nativeElement.classList.contains("tw-block")).toBe(false);
    expect(linkDebugElement.nativeElement.classList.contains("tw-block")).toBe(false);
  });
});

@Component({
  selector: "test-app",
  template: `
    <button type="button" bit-button [buttonType]="buttonType" [block]="block">Button</button>
    <a href="#" bit-button [buttonType]="buttonType" [block]="block"> Link </a>
  `,
})
class TestApp {
  buttonType: string;
  block: boolean;
}
