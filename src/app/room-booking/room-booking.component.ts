import {Component, OnInit} from '@angular/core';
import {BookingService} from '../services/booking Service/booking.service';
import {TokenStorageService} from '../services/tokenStorage/token-storage.service';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {DatePipe} from '@angular/common';
import {SweetAlertsService} from '../services/alerts/sweet-alerts.service';
import Swal from 'sweetalert2';
import {RegistrationService} from '../services/Registration/registration.service';

@Component({
  selector: 'app-room-booking',
  templateUrl: './room-booking.component.html',
  styleUrls: ['./room-booking.component.css']
})
export class RoomBookingComponent implements OnInit {
  userType: string;
  isAdmin = false;
  submitted = false;
  rooms = [];
  showTable = false;
  blockId = [];
  today = new Date();
  today1;
  payment;
  nodays;

  constructor(private bookingService: BookingService,
              private tokenStorageService: TokenStorageService,
              private datePipe: DatePipe,
              private regService: RegistrationService,
              private sweetAlerts: SweetAlertsService) {
    this.today1 = this.datePipe.transform(this.today, 'yyyy-MM-dd');
  }

  roomBookingForm = new FormGroup({
    startDate: new FormControl('', [Validators.required]),
    endDate: new FormControl('', [Validators.required])
  });

  ngOnInit(): void {
    this.userType = this.tokenStorageService.getUser();
    if (this.userType === 'admin') {
      this.isAdmin = true;
      this.roomBookingForm.addControl('sID', new FormControl('', [Validators.required]));
    } else {
      this.isAdmin = false;
      this.roomBookingForm.addControl('blockID', new FormControl('', [Validators.required]));
      this.getBlockByGenderId();
    }
  }

  get r() {
    return this.roomBookingForm.controls;
  }

  getBlockByGenderIdforAdmin(e: any) {
    let gentype;
    if (e.value === 1) {
      gentype = 'male';
    } else {
      gentype = 'female';
    }

    this.blockId = [];
    this.bookingService.getBlockByGender(gentype).subscribe(
      res => {
        console.log(res);
        if (res['data'].length > 0) {
          const room = res['data'];
          // tslint:disable-next-line:prefer-for-of
          for (let x = 0; x < room.length; x++) {
            this.blockId.push(room[x]);
          }
        }

      },
      error => {
        console.log(error);
      }
    );
  }

  getBlockByGenderId() {
    this.blockId = [];
    this.bookingService.getBlockByGender(localStorage.getItem('gender')).subscribe(
      res => {
        if (res['data'].length > 0) {
          const room = res['data'];
          // tslint:disable-next-line:prefer-for-of
          for (let x = 0; x < room.length; x++) {
            this.blockId.push(room[x]);
          }
        }

      },
      error => {
        console.log(error);
      }
    );
  }

  async onSubmit() {
    this.rooms = [];
    this.showTable = false;
    this.submitted = true;

    if (this.roomBookingForm.value.startDate < this.today1 || this.today <= this.roomBookingForm.value.endDate1) {
      this.roomBookingForm.controls['startDate'].setErrors({
        smallDate: true
      });
      this.roomBookingForm.controls['endDate'].setErrors({
        smallDate: true
      });
      return;
    }
    const one_day = 24 * 60 * 60 * 1000;
    const firstDate = new Date(this.roomBookingForm.value.startDate);
    const secondDate = new Date(this.roomBookingForm.value.endDate);
    // @ts-ignore
    const noOfdate = Math.round(Math.abs((secondDate - firstDate) / one_day));
    this.nodays = noOfdate;
    this.payment = 10*noOfdate;

    if (this.roomBookingForm.value.startDate > this.roomBookingForm.value.endDate) {
      this.roomBookingForm.controls['endDate'].setErrors({
        notLarge: true
      });
      return;
    }

    if (this.roomBookingForm.invalid) {
      return;
    }
    if (this.isAdmin) {
      let gender;
      let blocks = [];

      await this.regService.getUserByUniId(this.roomBookingForm.value.sID).toPromise().then(
        res => {
          if (res['success']) {
              gender = res['data']['gender'];
          } else {
            this.sweetAlerts.errorAlerts('Invalid Student ID',
              'No Record Found');
            return;
          }
        }
      ).catch(
        err => {
          console.log(err);
        }
      );

      const data = await this.bookingService.getBlockByGender(gender).toPromise().then().catch(
        err => {
          console.log(err);
        }
      );

      for (let i = 0; i < data['data'].length; i++) {

        this.roomBookingForm.value['blockID'] = data['data'][i]['blockID'];
        await this.bookingService.getAvailableRooms(this.roomBookingForm.value).toPromise().then(
          res => {
            if (res['success']) {
              if (res['data'].length > 0) {
                const room = res['data'];
                // tslint:disable-next-line:prefer-for-of
                for (let x = 0; x < room.length; x++) {
                  this.rooms.push(room[x]);
                }
                this.showTable = true;
              } else if (i < data['data'].length) {
              } else {
                this.sweetAlerts.errorAlerts('Unavailable',
                  'There are no rooms available for selected dates');
              }
            }
          }
        ).catch(
          err => {
            console.log(err);
          }
        );

      }
    } else {
      await this.bookingService.getAvailableRooms(this.roomBookingForm.value).toPromise().then(
        res => {
          if (res['success']) {
            if (res['data'].length > 0) {
              const room = res['data'];
              // tslint:disable-next-line:prefer-for-of
              for (let x = 0; x < room.length; x++) {
                this.rooms.push(room[x]);
              }
              this.showTable = true;
            } else {
              this.sweetAlerts.errorAlerts('Unavailable',
                'There are no rooms available for selected dates');
            }
          }
        }
      ).catch(
        err => {
          console.log(err);
        }
      );
    }


  }

  ConfirmWithSureMessage(roomID: number) {
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: 'btn btn-success',
        cancelButton: 'btn btn-danger'
      },
      buttonsStyling: true
    });

    swalWithBootstrapButtons.fire({
      title: 'Are you sure?',
      text: 'Do you need to allocate the room?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'confirm!',
      cancelButtonText: 'cancel!',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        let userBookingData;
        if (this.isAdmin) {
          userBookingData = {
            roomId: roomID,
            startDate: this.roomBookingForm.value.startDate,
            endDate: this.roomBookingForm.value.endDate,
            payment: this.payment,
            totalyPaid: 'no',
            status: 'pending',
            uniID: this.roomBookingForm.value.sID,
          };
        } else {
          userBookingData = {
            roomId: roomID,
            startDate: this.roomBookingForm.value.startDate,
            endDate: this.roomBookingForm.value.endDate,
            payment: this.payment,
            totalyPaid: 'no',
            status: 'pending',
            uniID: localStorage.getItem('userID')
          };
        }

        this.bookingService.addNewBooking(userBookingData).toPromise().then(
          res => {
            console.log(res);
            if (res['success']) {
              swalWithBootstrapButtons.fire(
                'Success!',
                'Booking Successfully Added',
                'success'
              );
              this.roomBookingForm.reset();
              this.submitted = false;
              this.showTable = false;
            } else {
              this.sweetAlerts.errorAlerts('Already Booked!', 'Student has already allocated a room in the selected dates');
              return;
            }

          }
        ).catch(err => {
          console.log(err);
        });
      } else if (
        /* Read more about handling dismissals below */
        result.dismiss === Swal.DismissReason.cancel
      ) {
        swalWithBootstrapButtons.fire(
          'Cancelled',
          'Request Canceled',
          'error'
        );
      }
    });
  }


}
